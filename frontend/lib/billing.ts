import { getToken } from "./auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export type PlanId = "TRIAL" | "FREE" | "PRO" | "ULTRA";

export interface MyBilling {
  plan: PlanId;
  trialEndsAt: string | null;
  isTrialActive: boolean;
  daysRemaining: number;
  proPriceInr: number;
  ultraPriceInr: number;
  displayProPriceInr: number;
  displayUltraPriceInr: number;
}

function authHeaders() {
  return { Authorization: `Bearer ${getToken()}`, "Content-Type": "application/json" };
}

async function handle(res: Response) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error ?? "Request failed");
  return data;
}

export async function getMyBilling(): Promise<MyBilling> {
  const res = await fetch(`${API_URL}/api/billing/me`, { headers: authHeaders() });
  return handle(res);
}

/**
 * Sets the account's plan directly — there's no payment gateway wired up (out of scope for
 * this pass), so this is the same shape a real payment provider's webhook would eventually
 * call. Not something to represent as "processing a real charge" anywhere in the UI.
 */
export async function upgradePlan(plan: "PRO" | "ULTRA"): Promise<{ plan: PlanId; trialEndsAt: string | null }> {
  const res = await fetch(`${API_URL}/api/billing/upgrade`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ plan }),
  });
  return handle(res);
}
