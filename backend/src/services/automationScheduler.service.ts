import { prisma } from "../config/db";
import { executeAutomation } from "./automationEngine.service";

const POLL_INTERVAL_MS = 60_000; // check for due automations once a minute
let tickerHandle: NodeJS.Timeout | null = null;
let lastTickAt: Date | null = null;

/**
 * Polling-based scheduler rather than in-memory setTimeout/node-cron jobs: this survives
 * server restarts and works correctly across multiple backend instances (each just queries
 * "what's due now" from the DB) without needing a separate scheduler service. If automation
 * volume grows enough that per-minute polling isn't precise/scalable enough, replace this
 * with a proper job queue (e.g. BullMQ + Redis) — the `executeAutomation` function this
 * calls doesn't need to change, only what calls it.
 */
export function startAutomationScheduler(): void {
  if (tickerHandle) return; // already running
  tickerHandle = setInterval(runDueAutomations, POLL_INTERVAL_MS);
  // Also run once shortly after boot so nothing waits a full minute after a restart.
  setTimeout(runDueAutomations, 5000);
  console.log("Automation scheduler started (polling every 60s)");
}

export function stopAutomationScheduler(): void {
  if (tickerHandle) clearInterval(tickerHandle);
  tickerHandle = null;
}

/** Used by the Admin Panel's platform-health endpoint (admin.service.ts). */
export function getSchedulerStatus(): { running: boolean; lastTickAt: Date | null } {
  return { running: tickerHandle !== null, lastTickAt };
}

async function runDueAutomations(): Promise<void> {
  lastTickAt = new Date();
  const due = await prisma.automation.findMany({
    where: {
      status: "ACTIVE",
      type: { in: ["SCHEDULED", "ONE_TIME"] },
      nextRunAt: { lte: new Date() },
    },
  });

  // Sequential on purpose: automations call an LLM (and possibly other rate-limited APIs);
  // running them one at a time avoids bursting provider rate limits on a busy minute.
  for (const automation of due) {
    try {
      await executeAutomation(automation);
    } catch (err) {
      // executeAutomation already records failures on the run/automation itself; this
      // catch only guards against something throwing outside that (e.g. a DB hiccup) so
      // one bad automation can't stop the rest of the batch from running.
      console.error(`Automation ${automation.id} failed outside executeAutomation:`, err);
    }
  }
}
