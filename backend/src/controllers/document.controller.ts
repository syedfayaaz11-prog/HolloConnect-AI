import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { askDocumentSchema, compareDocumentsSchema, translateDocumentSchema } from "../utils/validation";
import { extractText } from "../services/documentExtract.service";
import { saveBuffer, deleteFile } from "../services/storage.service";
import { getCompletion } from "../services/ai.service";
import { resolveUserModel } from "../utils/resolveUserModel";
import { matchesFileSignature, SIGNATURE_LESS_MIME_TYPES } from "../utils/fileSignature";
import { friendlyDocumentError } from "../utils/friendlyError";

// Keeps prompts within a reasonable size regardless of how large the source document is.
const CONTEXT_CHAR_LIMIT = 12_000;

export async function uploadDocument(req: AuthedRequest, res: Response) {
  const file = (req as unknown as { file?: Express.Multer.File }).file;
  if (!file) throw new ApiError(400, "No file uploaded");

  // multer's fileFilter already checked the claimed Content-Type; this additionally checks
  // the real bytes for types that have a reliable signature, catching a file that's been
  // renamed/relabeled to pass the mimetype check without actually being that type.
  if (!SIGNATURE_LESS_MIME_TYPES.has(file.mimetype) && !matchesFileSignature(file.buffer, [file.mimetype])) {
    throw new ApiError(400, "File content doesn't match its declared type");
  }

  const url = await saveBuffer(file.buffer, "documents", file.originalname.split(".").pop() || "bin");

  const record = await prisma.document.create({
    data: {
      userId: req.user!.userId,
      filename: file.originalname,
      fileUrl: url,
      mimeType: file.mimetype,
      status: "PROCESSING",
    },
  });

  // Same field selection as getDocument — fileUrl stays internal-only.
  const DOCUMENT_SELECT = {
    id: true,
    filename: true,
    mimeType: true,
    status: true,
    error: true,
    createdAt: true,
    extractedText: true,
    summary: true,
  } as const;

  try {
    const text = await extractText(file.buffer, file.mimetype, file.originalname);
    const updated = await prisma.document.update({
      where: { id: record.id },
      data: { status: "READY", extractedText: text },
      select: DOCUMENT_SELECT,
    });
    return res.status(201).json({ document: updated });
  } catch (err) {
    const updated = await prisma.document.update({
      where: { id: record.id },
      data: { status: "FAILED", error: friendlyDocumentError(err, "document.controller:extractText") },
      select: DOCUMENT_SELECT,
    });
    return res.status(201).json({ document: updated });
  }
}

export async function listDocuments(req: AuthedRequest, res: Response) {
  const documents = await prisma.document.findMany({
    where: { userId: req.user!.userId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      filename: true,
      mimeType: true,
      status: true,
      error: true,
      createdAt: true,
    },
  });
  res.json({ documents });
}

export async function getDocument(req: AuthedRequest, res: Response) {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
    // fileUrl deliberately excluded — it's a local /uploads path the frontend never reads
    // (confirmed: no component references DocumentRecord.fileUrl), so there's no reason to
    // expose it, let alone sign it. Everything the UI actually uses is still here.
    select: {
      id: true,
      filename: true,
      mimeType: true,
      status: true,
      error: true,
      createdAt: true,
      extractedText: true,
      summary: true,
    },
  });
  if (!document) throw new ApiError(404, "Document not found");
  res.json({ document });
}

export async function deleteDocument(req: AuthedRequest, res: Response) {
  const document = await prisma.document.findFirst({
    where: { id: req.params.id, userId: req.user!.userId },
  });
  if (!document) throw new ApiError(404, "Document not found");
  await deleteFile(document.fileUrl);
  await prisma.document.delete({ where: { id: document.id } });
  res.status(204).end();
}

async function requireReadyDocument(id: string, userId: string) {
  const document = await prisma.document.findFirst({ where: { id, userId } });
  if (!document) throw new ApiError(404, "Document not found");
  if (document.status !== "READY" || !document.extractedText) {
    throw new ApiError(400, "Document is not ready yet (still processing or failed to extract text)");
  }
  return document;
}

export async function summarizeDocument(req: AuthedRequest, res: Response) {
  const document = await requireReadyDocument(req.params.id, req.user!.userId);
  const model = await resolveUserModel(req.user!.userId);

  const summary = await getCompletion(model, [
    {
      role: "system",
      content:
        "Summarize the following document clearly and concisely, covering its key points. Use markdown.",
    },
    { role: "user", content: document.extractedText!.slice(0, CONTEXT_CHAR_LIMIT) },
  ]);

  const updated = await prisma.document.update({
    where: { id: document.id },
    data: { summary },
  });

  res.json({ document: updated });
}

export async function askDocument(req: AuthedRequest, res: Response) {
  const parsed = askDocumentSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const document = await requireReadyDocument(req.params.id, req.user!.userId);
  const model = await resolveUserModel(req.user!.userId);

  const answer = await getCompletion(model, [
    {
      role: "system",
      content:
        "Answer the user's question using ONLY the document content provided. If the answer " +
        "isn't in the document, say so plainly rather than guessing.",
    },
    {
      role: "user",
      content: `Document "${document.filename}":\n\n${document.extractedText!.slice(0, CONTEXT_CHAR_LIMIT)}\n\nQuestion: ${parsed.data.question}`,
    },
  ]);

  res.json({ answer });
}

export async function translateDocument(req: AuthedRequest, res: Response) {
  const parsed = translateDocumentSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const document = await requireReadyDocument(req.params.id, req.user!.userId);
  const model = await resolveUserModel(req.user!.userId);

  const translated = await getCompletion(model, [
    {
      role: "system",
      content: `Translate the following document text into ${parsed.data.targetLanguage}. Preserve structure and meaning; do not add commentary.`,
    },
    { role: "user", content: document.extractedText!.slice(0, CONTEXT_CHAR_LIMIT) },
  ]);

  res.json({ translated });
}

export async function compareDocuments(req: AuthedRequest, res: Response) {
  const parsed = compareDocumentsSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);
  const { documentIdA, documentIdB } = parsed.data;

  const [docA, docB] = await Promise.all([
    requireReadyDocument(documentIdA, req.user!.userId),
    requireReadyDocument(documentIdB, req.user!.userId),
  ]);

  const model = await resolveUserModel(req.user!.userId);

  const comparison = await getCompletion(model, [
    {
      role: "system",
      content:
        "Compare the two documents below. Identify key similarities, differences, and " +
        "notable discrepancies. Use markdown with clear sections.",
    },
    {
      role: "user",
      content: `Document A ("${docA.filename}"):\n${docA.extractedText!.slice(0, CONTEXT_CHAR_LIMIT / 2)}\n\nDocument B ("${docB.filename}"):\n${docB.extractedText!.slice(0, CONTEXT_CHAR_LIMIT / 2)}`,
    },
  ]);

  res.json({ comparison });
}
