import { Response } from "express";
import { prisma } from "../config/db";
import { AuthedRequest } from "../middleware/auth";
import { ApiError } from "../middleware/errorHandler";
import { getSettings } from "../services/admin.service";
import { upgradePlanSchema } from "../utils/validation";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * GET /api/billing/me — everything the Pricing page needs in one call: the user's current
 * plan, trial status, and the admin-configured prices (with the trial override applied —
 * both plans show ₹0/month while a trial is active, per the "New User Offer" requirement).
 */
export async function getMyBilling(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: { plan: true, trialEndsAt: true },
  });
  if (!user) throw new ApiError(404, "User not found");

  const settings = await getSettings();
  const now = new Date();
  const isTrialActive = user.plan === "TRIAL" && !!user.trialEndsAt && user.trialEndsAt > now;
  const daysRemaining = isTrialActive
    ? Math.max(0, Math.ceil((user.trialEndsAt!.getTime() - now.getTime()) / MS_PER_DAY))
    : 0;

  res.json({
    plan: user.plan,
    trialEndsAt: user.trialEndsAt,
    isTrialActive,
    daysRemaining,
    proPriceInr: settings.proPriceInr,
    ultraPriceInr: settings.ultraPriceInr,
    // What the Pricing page should actually display right now — 0 during an active trial,
    // the real admin-configured price otherwise. Keeping this computed server-side means the
    // frontend never has to duplicate the trial-pricing rule.
    displayProPriceInr: isTrialActive ? 0 : settings.proPriceInr,
    displayUltraPriceInr: isTrialActive ? 0 : settings.ultraPriceInr,
  });
}

/**
 * POST /api/billing/upgrade — sets the user's plan directly. There's no payment gateway
 * integrated here (wasn't part of this request, and fabricating one that only *looks* like it
 * charges a card would be actively misleading) — this is the same shape a real payment
 * provider's webhook handler would end up calling once one is wired up, so the rest of the
 * app (plan checks, the Pricing page's "Current Plan" indicator) doesn't need to change when
 * that happens.
 */
export async function upgradePlan(req: AuthedRequest, res: Response) {
  const parsed = upgradePlanSchema.safeParse(req.body);
  if (!parsed.success) throw new ApiError(400, parsed.error.errors[0].message);

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: { plan: parsed.data.plan, trialEndsAt: null },
    select: { plan: true, trialEndsAt: true },
  });

  res.json({ plan: user.plan, trialEndsAt: user.trialEndsAt });
}
