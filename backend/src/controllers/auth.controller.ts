import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import { prisma } from "../config/db";
import { signToken } from "../utils/jwt";
import { loginSchema, registerSchema, updateProfileSchema, googleAuthSchema } from "../utils/validation";
import { ApiError } from "../middleware/errorHandler";
import { AuthedRequest } from "../middleware/auth";
import { verifyGoogleIdToken, ConfigError, VerificationError } from "../services/googleAuth.service";

const ME_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  defaultModel: true,
  avatarUrl: true,
  reducedMotion: true,
  memoryEnabled: true,
  plan: true,
  trialEndsAt: true,
} as const;

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }
  const { email, password, name } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ApiError(409, "An account with this email already exists");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 60); // 2-month free trial, every new signup
  const user = await prisma.user.create({
    data: { email, passwordHash, name, plan: "TRIAL", trialEndsAt },
  });

  const token = signToken({ userId: user.id, role: user.role });
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }
  const { email, password } = parsed.data;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.passwordHash) {
    throw new ApiError(401, "This account uses Google Sign-In. Use \"Continue with Google\" to log in.");
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new ApiError(401, "Invalid email or password");
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been disabled. Contact an administrator.");
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}

export async function me(req: AuthedRequest, res: Response) {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: ME_SELECT,
  });
  if (!user) {
    throw new ApiError(404, "User not found");
  }
  res.json({ user });
}

/**
 * PATCH /api/auth/me — the Settings page's real update endpoint. Handles Appearance
 * (reducedMotion) and Memory (memoryEnabled) so far; `name` is included too since it's the
 * one other genuinely user-editable profile field. Voice already has its own dedicated
 * PATCH /api/voice/settings (voice.controller.ts) since it validates against the live list
 * of available voices — left as-is rather than duplicated here.
 */
export async function updateMe(req: AuthedRequest, res: Response) {
  const parsed = updateProfileSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }
  if (Object.keys(parsed.data).length === 0) {
    throw new ApiError(400, "No fields to update");
  }

  const user = await prisma.user.update({
    where: { id: req.user!.userId },
    data: parsed.data,
    select: ME_SELECT,
  });
  res.json({ user });
}

/**
 * DELETE /api/auth/me — the Privacy section's account-deletion action. Every user-owned
 * relation in schema.prisma (chats, projects, memories, generated images/videos, documents,
 * automations, agents, search/research history) is declared `onDelete: Cascade`, so this one
 * delete call is genuinely a full, permanent data wipe, not a soft-delete — matches what the
 * Settings UI's confirmation copy says.
 */
export async function deleteMe(req: AuthedRequest, res: Response) {
  await prisma.user.delete({ where: { id: req.user!.userId } });
  res.status(204).end();
}

/**
 * POST /api/auth/google — { credential: <Google ID token JWT> }. The frontend gets this
 * credential directly from Google Identity Services in the browser (no server-side OAuth
 * redirect dance needed) and just forwards it here.
 *
 * Three cases, same as any "sign in with X" flow:
 *  1. googleId already on file -> that's the account, log in.
 *  2. No googleId match, but the email matches an existing (password) account -> link Google
 *     to it (sets googleId) rather than creating a duplicate account for the same person.
 *     Their existing password keeps working afterward too — this is additive, not a
 *     replacement of their login method.
 *  3. No match at all -> brand-new account, same trial setup as normal registration, just
 *     with no password (passwordHash stays null until/unless they ever set one).
 */
export async function googleAuth(req: Request, res: Response) {
  const parsed = googleAuthSchema.safeParse(req.body);
  if (!parsed.success) {
    throw new ApiError(400, parsed.error.errors[0].message);
  }

  const profile = await verifyGoogleIdToken(parsed.data.credential).catch((err) => {
    if (err instanceof VerificationError) throw new ApiError(401, err.message);
    if (err instanceof ConfigError) throw new ApiError(503, err.message);
    throw err;
  });

  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

  if (!user) {
    const byEmail = await prisma.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      user = await prisma.user.update({ where: { id: byEmail.id }, data: { googleId: profile.googleId } });
    } else {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 60); // same 2-month trial as normal registration
      user = await prisma.user.create({
        data: {
          email: profile.email,
          googleId: profile.googleId,
          name: profile.name,
          avatarUrl: profile.picture,
          plan: "TRIAL",
          trialEndsAt,
        },
      });
    }
  }

  if (!user.isActive) {
    throw new ApiError(403, "This account has been disabled. Contact an administrator.");
  }

  const token = signToken({ userId: user.id, role: user.role });
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  });
}
