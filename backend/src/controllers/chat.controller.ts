import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { friendlyProviderError } from "../utils/friendlyError";
import { createMessageSchema, updateChatSchema } from "../utils/validation";
import { streamCompletion } from "../services/ai.service";
import { getUserCredentialsForModel } from "../services/apiKeys.service";
import { resolveUserModel } from "../utils/resolveUserModel";
import {
  buildMemoryContextBlock,
  extractAndStoreFacts,
  isMemoryEnabled,
  refreshShortTermSummary,
  retrieveRelevantMemories,
} from "../services/memory.service";

// Skip fact-extraction on trivial exchanges (greetings, one-word replies) — not worth an
// extra model call, and there's rarely anything durable to extract from them anyway.
const MIN_CONTENT_LENGTH_FOR_EXTRACTION = 20;

export async function listChats(req: AuthedRequest, res: Response) {
  const chats = await prisma.chat.findMany({
    where: { userId: req.user!.userId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, title: true, model: true, pinned: true, updatedAt: true },
  });
  res.json({ chats });
}

export async function getChat(req: AuthedRequest, res: Response) {
  const chat = await prisma.chat.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!chat) throw new ApiError(404, "Chat not found");
  res.json({ chat });
}

export async function deleteChat(req: AuthedRequest, res: Response) {
  const chat = await prisma.chat.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!chat) throw new ApiError(404, "Chat not found");
  await prisma.chat.delete({ where: { id: chat.id } });
  res.status(204).end();
}

/**
 * PATCH /api/chat/:id — { title }. Backs the sidebar's Rename action. `title` already existed
 * on the Chat model (auto-set from the first message / defaults to "New Chat") — this is the
 * first endpoint that lets a user override it, not a schema change.
 */
export async function updateChat(req: AuthedRequest, res: Response) {
  const parsed = updateChatSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }
  const chat = await prisma.chat.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!chat) throw new ApiError(404, "Chat not found");

  const updated = await prisma.chat.update({
    where: { id: chat.id },
    data: { title: parsed.data.title },
    select: { id: true, title: true, model: true, pinned: true, updatedAt: true },
  });
  res.json({ chat: updated });
}

/**
 * Streams an AI response over Server-Sent Events.
 * POST /api/chat/message  { chatId?, content, model? }
 * If chatId is omitted, a new chat is created from the first message.
 */
export async function sendMessage(req: AuthedRequest, res: Response) {
  const parsed = createMessageSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }
  const { content, model } = parsed.data;
  const userId = req.user!.userId;

  let chat = parsed.data.chatId
    ? await prisma.chat.findFirst({ where: { id: parsed.data.chatId, userId } })
    : null;

  if (parsed.data.chatId && !chat) {
    throw new ApiError(404, "Chat not found");
  }

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        userId,
        title: content.slice(0, 60),
        model: await resolveUserModel(userId, model),
      },
    });
  }

  await prisma.message.create({
    data: { chatId: chat.id, role: "USER", content, model: chat.model },
  });

  const history = await prisma.message.findMany({
    where: { chatId: chat.id },
    orderBy: { createdAt: "asc" },
  });

  // Set up SSE
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();

  res.write(`event: chat_id\ndata: ${chat.id}\n\n`);

  let fullResponse = "";
  const clientDisconnected = { flag: false };
  req.on("close", () => {
    clientDisconnected.flag = true;
  });

  try {
    const turns = history.map((m) => ({
      role: m.role.toLowerCase() as "user" | "assistant" | "system",
      content: m.content,
    }));

    // Automatic memory recall/capture (both below) are gated on the user's Settings ->
    // Memory toggle — fetched once and reused for both, rather than checking twice.
    const memoryEnabled = await isMemoryEnabled(userId);

    // Surface relevant memory as context: this chat's own short-term summary/facts plus
    // the user's global long-term memories (preferences, facts), ranked together by
    // memory.service.ts's retrieval scorer — same function Agents and Automation use.
    if (memoryEnabled) {
      const relevant = await retrieveRelevantMemories(userId, content, {
        source: `chat:${chat.id}`,
        limit: 5,
      });
      const memoryContext = buildMemoryContextBlock(relevant);
      if (memoryContext) {
        turns.unshift({ role: "system", content: memoryContext });
      }
    }

    // BYOK: use the user's own stored key for this model's provider if they have one;
    // otherwise credentials is `{}` and streamCompletion falls back to the server's own
    // env-var-configured key exactly as it did before this feature existed.
    const credentials = await getUserCredentialsForModel(userId, chat.model);

    for await (const token of streamCompletion(chat.model, turns, credentials)) {
      if (clientDisconnected.flag) break;
      fullResponse += token;
      res.write(`event: token\ndata: ${JSON.stringify(token)}\n\n`);
    }

    if (fullResponse) {
      await prisma.message.create({
        data: { chatId: chat.id, role: "ASSISTANT", content: fullResponse, model: chat.model },
      });
      await prisma.chat.update({ where: { id: chat.id }, data: { updatedAt: new Date() } });

      // Automatic memory capture — deliberately NOT awaited, so it never adds latency to
      // the streamed response the user is watching. Both functions are self-contained and
      // log their own errors rather than needing anything here to handle failures.
      if (memoryEnabled) {
        const chatSource = `chat:${chat.id}`;
        if (content.length >= MIN_CONTENT_LENGTH_FOR_EXTRACTION) {
          const exchange = `User: ${content}\n\nAssistant: ${fullResponse}`;
          extractAndStoreFacts(userId, chatSource, exchange, chat.model).catch((err) =>
            console.error(`Fact extraction failed for chat ${chat.id}:`, err)
          );
        }

        // Refresh the rolling short-term summary every 4 user messages rather than every
        // single turn — the summary is meant to capture drift over the conversation, not
        // change on every message, and this keeps the extra model call proportional to
        // conversation length instead of firing constantly on short back-and-forth exchanges.
        // `history` already includes the user message just sent (fetched after creating it
        // above), so no `+1` here — that would double-count it and throw off the modulo.
        const userMessageCount = history.filter((m) => m.role === "USER").length;
        if (userMessageCount % 4 === 0) {
          const transcript = [...history, { role: "ASSISTANT" as const, content: fullResponse }]
            .map((m) => `${m.role}: ${m.content}`)
            .join("\n\n");
          refreshShortTermSummary(userId, chatSource, transcript, chat.model).catch((err) =>
            console.error(`Short-term summary refresh failed for chat ${chat.id}:`, err)
          );
        }
      }
    }

    res.write(`event: done\ndata: end\n\n`);
  } catch (err) {
    res.write(`event: error\ndata: ${JSON.stringify(friendlyProviderError(err, "chat stream"))}\n\n`);
  } finally {
    res.end();
  }
}
