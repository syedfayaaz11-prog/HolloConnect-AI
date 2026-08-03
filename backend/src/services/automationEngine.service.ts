import { Automation } from "@prisma/client";
import { prisma } from "../config/db";
import { getCompletion } from "./ai.service";
import { parseExpression } from "cron-parser";
import { buildMemoryContextBlock, extractAndStoreFacts, isMemoryEnabled, retrieveRelevantMemories } from "./memory.service";
import { friendlyProviderError } from "../utils/friendlyError";

const SYSTEM_PROMPT = `You are HolloConnect AI's automation engine, executing a scheduled or
triggered task autonomously on behalf of a user (no one is present to answer follow-up
questions). Complete the task described below as thoroughly as you can from the instructions
given, and report a clear, concise result. If the task can't be completed as described, say
so plainly and explain what would be needed.`;

/**
 * Executes one automation's AI task and records the run. Used by the scheduler ticker
 * (scheduled/one-time), the manual "Run now" endpoint, and the public webhook trigger —
 * every execution path funnels through this single function so history/logging is
 * consistent regardless of what triggered the run.
 */
export async function executeAutomation(automation: Automation): Promise<void> {
  const run = await prisma.automationRun.create({
    data: { automationId: automation.id, status: "RUNNING" },
  });

  const source = `automation:${automation.id}`;

  try {
    // Same shared Memory service Chat and Agents use — an automation gets the user's
    // relevant global memories plus anything scoped to this automation specifically
    // (e.g. a fact it saved on a prior run), ranked together by memory.service.ts. Gated on
    // the user's Settings -> Memory toggle, same as Chat and Agents.
    const memoryEnabled = await isMemoryEnabled(automation.userId);
    const relevant = memoryEnabled
      ? await retrieveRelevantMemories(automation.userId, automation.prompt, {
          source,
          limit: 5,
        })
      : [];
    const memoryContext = buildMemoryContextBlock(relevant);

    const output = await getCompletion(automation.model, [
      { role: "system", content: memoryContext ? `${SYSTEM_PROMPT}\n\n${memoryContext}` : SYSTEM_PROMPT },
      { role: "user", content: automation.prompt },
    ]);

    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: "SUCCESS", output, finishedAt: new Date() },
    });

    // Fire-and-forget: let a run's own result feed back into memory for next time (e.g. a
    // recurring "check X and report" automation building up durable findings over time),
    // without making the run itself wait on an extra model call.
    if (memoryEnabled) {
      const exchange = `Task: ${automation.prompt}\n\nResult: ${output}`;
      extractAndStoreFacts(automation.userId, source, exchange, automation.model).catch((err) =>
        console.error(`Fact extraction failed for automation ${automation.id}:`, err)
      );
    }

    await advanceAutomation(automation, true);
  } catch (err) {
    await prisma.automationRun.update({
      where: { id: run.id },
      data: { status: "FAILED", error: friendlyProviderError(err, "automationEngine.service"), finishedAt: new Date() },
    });

    await advanceAutomation(automation, false);
  }
}

/** Updates lastRunAt/nextRunAt/status after a run, based on the automation's type. */
async function advanceAutomation(automation: Automation, _succeeded: boolean): Promise<void> {
  const now = new Date();

  if (automation.type === "ONE_TIME") {
    await prisma.automation.update({
      where: { id: automation.id },
      data: { lastRunAt: now, status: "COMPLETED", nextRunAt: null },
    });
    return;
  }

  if (automation.type === "SCHEDULED" && automation.cronExpression) {
    const nextRunAt = computeNextRun(automation.cronExpression, now);
    await prisma.automation.update({
      where: { id: automation.id },
      data: { lastRunAt: now, nextRunAt },
    });
    return;
  }

  // TRIGGER type: no schedule to advance, just record when it last fired.
  await prisma.automation.update({
    where: { id: automation.id },
    data: { lastRunAt: now },
  });
}

export function computeNextRun(cronExpression: string, from: Date = new Date()): Date {
  const interval = parseExpression(cronExpression, { currentDate: from });
  return interval.next().toDate();
}
