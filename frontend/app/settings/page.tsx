"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Settings as SettingsIcon,
  User,
  LogOut,
  Copy,
  Check,
  ShieldCheck,
  BrainCircuit,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button, Switch, Input } from "@/components/ui/primitives";
import { getToken, clearToken } from "@/lib/auth";
import { listMemories } from "@/lib/memory";
import { updateProfile, deleteAccount } from "@/lib/settings";
import { useMotionPreference, useSetMotionPreference } from "@/components/providers/MotionPreferenceProvider";
import { VoiceSettingsPanel } from "@/components/voice/VoiceSettingsPanel";
import { AiProvidersPanel } from "@/components/settings/AiProvidersPanel";
import { useVoicePlayback } from "@/hooks/useVoicePlayback";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

// Extends the base AuthUser with the extra fields /api/auth/me already returns
// (defaultModel, avatarUrl) — fetched locally so lib/auth.ts stays untouched.
interface ProfileDetail {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  defaultModel: string;
  avatarUrl: string | null;
  reducedMotion: boolean;
  memoryEnabled: boolean;
}

function initials(name: string | null, email: string): string {
  const source = name?.trim() || email;
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  return parts.slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "?";
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2.5 px-1">{children}</h2>;
}

export default function SettingsPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileDetail | null>(null);
  const [memoryCount, setMemoryCount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [savingMotion, setSavingMotion] = useState(false);
  const [savingMemory, setSavingMemory] = useState(false);
  const [deleteStep, setDeleteStep] = useState<"idle" | "confirm">("idle");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const reducedMotion = useMotionPreference();
  const setMotionOverride = useSetMotionPreference();
  const { speak } = useVoicePlayback();

  useEffect(() => {
    if (checking || !user) return;
    const token = getToken();
    if (!token) return;
    fetch(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => res.json())
      .then((data) => setProfile(data.user))
      .catch(() => setError("Couldn't load account details."));
    listMemories({ pageSize: 1 })
      .then((r) => setMemoryCount(r.total))
      .catch(() => setMemoryCount(null));
  }, [checking, user]);

  function copyUserId() {
    if (!profile) return;
    navigator.clipboard.writeText(profile.id);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function onToggleMotion(next: boolean) {
    setMotionOverride(next); // optimistic — feels instant, and HolloConnectLogo reacts immediately
    setSavingMotion(true);
    setError(null);
    try {
      const updated = await updateProfile({ reducedMotion: next });
      setProfile((p) => (p ? { ...p, reducedMotion: updated.reducedMotion ?? next } : p));
    } catch (err) {
      setMotionOverride(!next); // revert on failure
      setError((err as Error).message);
    } finally {
      setSavingMotion(false);
    }
  }

  async function onToggleMemory(next: boolean) {
    setProfile((p) => (p ? { ...p, memoryEnabled: next } : p)); // optimistic
    setSavingMemory(true);
    setError(null);
    try {
      const updated = await updateProfile({ memoryEnabled: next });
      setProfile((p) => (p ? { ...p, memoryEnabled: updated.memoryEnabled ?? next } : p));
    } catch (err) {
      setProfile((p) => (p ? { ...p, memoryEnabled: !next } : p)); // revert on failure
      setError((err as Error).message);
    } finally {
      setSavingMemory(false);
    }
  }

  async function onDeleteAccount() {
    setDeleting(true);
    setDeleteError(null);
    try {
      await deleteAccount();
      router.replace("/login");
    } catch (err) {
      setDeleteError((err as Error).message);
      setDeleting(false);
    }
  }

  function onSignOut() {
    clearToken();
    router.replace("/login");
  }

  if (checking || !user) {
    return <PageLoadingScreen />;
  }

  const deleteConfirmMatches = deleteConfirmText.trim().toLowerCase() === user.email.toLowerCase();

  return (
    <AppShell user={user}>
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center">
            <SettingsIcon size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-white tracking-tight">Settings</h1>
            <p className="text-xs text-gray-400">Your account and preferences</p>
          </div>
        </motion.div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div>
          <SectionLabel>Account</SectionLabel>
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <User size={15} className="text-accent-violet" />
              <h2 className="text-sm font-semibold text-white">Profile</h2>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-14 h-14 shrink-0 rounded-2xl bg-accent-gradient-soft border border-white/10 flex items-center justify-center text-accent-violet font-semibold text-lg">
                {initials(user.name ?? null, user.email)}
              </div>
              <div className="min-w-0">
                <p className="text-sm text-white font-medium truncate">{user.name || "Unnamed"}</p>
                <p className="text-xs text-gray-400 truncate mt-0.5">{user.email}</p>
                <span className="inline-flex items-center gap-1 text-[11px] font-medium rounded-md px-1.5 py-0.5 bg-white/[0.06] text-gray-300 mt-1.5">
                  {user.role === "ADMIN" && <ShieldCheck size={11} className="text-accent-violet" />}
                  {user.role === "ADMIN" ? "Administrator" : "Member"}
                </span>
              </div>
            </div>

            <div className="h-px bg-white/[0.06] my-4" />

            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs text-gray-500 mb-1">User ID</p>
                <code className="text-xs text-gray-400 truncate block">{profile?.id ?? user.id}</code>
              </div>
              <Button variant="ghost" onClick={copyUserId} className="shrink-0 flex items-center gap-1.5">
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
          </GlassCard>
        </div>

        <div>
          <SectionLabel>Appearance</SectionLabel>
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <Sparkles size={15} className="text-accent-violet" />
              <h2 className="text-sm font-semibold text-white">Motion</h2>
            </div>
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-200">Reduce motion</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  Turns off HolloConnect's animated logo — the chat thinking indicator, sidebar
                  mark, and loading states — in favor of a still version. Saved to your account,
                  on top of your system's own reduce-motion setting.
                </p>
              </div>
              <Switch checked={reducedMotion} onChange={onToggleMotion} disabled={savingMotion} label="Reduce motion" />
            </div>
          </GlassCard>
        </div>

        <div>
          <SectionLabel>AI Providers</SectionLabel>
          <AiProvidersPanel />
        </div>

        <div>
          <SectionLabel>Voice</SectionLabel>
          <VoiceSettingsPanel onPreview={(voice) => speak("This is what I sound like.", voice)} />
        </div>

        <div>
          <SectionLabel>Memory &amp; Privacy</SectionLabel>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <BrainCircuit size={15} className="text-accent-violet" />
              <h2 className="text-sm font-semibold text-white">Memory</h2>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              HolloConnect can remember facts, preferences, and summaries you or the AI save during
              Chat, Agents, and Automation runs, so future conversations can use that context. You're
              always in control — view, search, and delete anything remembered from the Memory page.
            </p>

            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="min-w-0">
                <p className="text-sm text-gray-200">Use memory automatically</p>
                <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">
                  When off, Chat, Agents, and Automation stop reading or saving memory
                  automatically. Existing memories are kept — manage them below.
                </p>
              </div>
              <Switch
                checked={profile?.memoryEnabled ?? true}
                onChange={onToggleMemory}
                disabled={savingMemory || !profile}
                label="Use memory automatically"
              />
            </div>

            <div className="h-px bg-white/[0.06] my-4" />

            <div className="flex items-center justify-between">
              <p className="text-xs text-gray-400">
                {memoryCount === null ? "—" : `${memoryCount} ${memoryCount === 1 ? "memory" : "memories"} saved`}
              </p>
              <Link href="/memory">
                <Button variant="ghost" className="flex items-center gap-1.5">
                  Manage memory
                  <ArrowRight size={13} />
                </Button>
              </Link>
            </div>
          </GlassCard>
        </div>

        <div>
          <SectionLabel>Privacy</SectionLabel>
          <GlassCard>
            <div className="flex items-center gap-2 mb-3">
              <ShieldAlert size={15} className="text-red-400" />
              <h2 className="text-sm font-semibold text-white">Delete account</h2>
            </div>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">
              Permanently deletes your account and everything tied to it — chats, memories,
              projects, generated images and videos, documents, automations, and agents. This
              can't be undone.
            </p>

            {deleteStep === "idle" ? (
              <Button
                variant="ghost"
                onClick={() => setDeleteStep("confirm")}
                className="flex items-center gap-1.5 text-red-400 hover:text-red-300"
              >
                <Trash2 size={14} />
                Delete my account
              </Button>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-xl border border-red-500/20 bg-red-500/[0.04] p-4"
              >
                <div className="flex items-start gap-2 mb-3">
                  <AlertTriangle size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300 leading-relaxed">
                    Type your email address (<span className="font-medium">{user.email}</span>) to
                    confirm. This deletes everything immediately and can't be undone.
                  </p>
                </div>
                <Input
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder={user.email}
                  className="mb-3"
                />
                {deleteError && <p className="text-xs text-red-400 mb-3">{deleteError}</p>}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: !deleteConfirmMatches || deleting ? 1 : 1.02 }}
                    whileTap={{ scale: !deleteConfirmMatches || deleting ? 1 : 0.98 }}
                    onClick={onDeleteAccount}
                    disabled={!deleteConfirmMatches || deleting}
                    className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-medium bg-red-500 text-white transition-opacity disabled:opacity-40 disabled:cursor-not-allowed disabled:pointer-events-none hover:bg-red-400"
                  >
                    <Trash2 size={13} />
                    {deleting ? "Deleting…" : "Permanently delete"}
                  </motion.button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setDeleteStep("idle");
                      setDeleteConfirmText("");
                      setDeleteError(null);
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                </div>
              </motion.div>
            )}
          </GlassCard>
        </div>

        <div>
          <SectionLabel>Session</SectionLabel>
          <GlassCard>
            <div className="flex items-center gap-2 mb-4">
              <LogOut size={15} className="text-accent-violet" />
              <h2 className="text-sm font-semibold text-white">Sign out</h2>
            </div>
            <p className="text-xs text-gray-500 mb-4 leading-relaxed">
              Sign out of HolloConnect AI on this device. You'll need to log in again to continue.
            </p>
            <Button variant="ghost" onClick={onSignOut} className="flex items-center gap-1.5 text-red-400 hover:text-red-300">
              <LogOut size={14} />
              Sign out
            </Button>
          </GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
