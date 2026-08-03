"use client";

import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useRequireAdmin } from "@/hooks/useRequireAdmin";
import { GlassCard, Input, Button } from "@/components/ui/primitives";
import { PlatformSettings, getSettings, updateSettings } from "@/lib/admin";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

export default function AdminSettingsPage() {
  const { user, checking } = useRequireAdmin();
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    getSettings().then(setSettings).catch((err) => setError(err.message));
  }, [checking]);

  async function onSave() {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateSettings(settings);
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (checking || !settings) {
    return <PageLoadingScreen />;
  }

  return (
    <AdminShell user={user}>
      <div className="max-w-2xl mx-auto w-full px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-white">Settings</h1>
          <p className="text-sm text-gray-400 mt-1">
            Persisted to the database (`settings` table) — real, not local-only.
          </p>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <GlassCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">General</h2>
          <Input
            value={settings.platformName}
            onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
            placeholder="Platform name"
          />
          <Input
            value={settings.supportEmail}
            onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
            placeholder="Support email"
            type="email"
          />
        </GlassCard>

        <GlassCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">AI</h2>
          <Input
            value={settings.defaultModel}
            onChange={(e) => setSettings({ ...settings, defaultModel: e.target.value })}
            placeholder="Default model for new users"
          />
        </GlassCard>

        <GlassCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Security &amp; Authentication</h2>
          <ToggleRow
            label="Allow new signups"
            checked={settings.allowSignups}
            onChange={(v) => setSettings({ ...settings, allowSignups: v })}
          />
          <ToggleRow
            label="Require email verification"
            checked={settings.requireEmailVerification}
            onChange={(v) => setSettings({ ...settings, requireEmailVerification: v })}
          />
          <div>
            <label className="text-xs text-gray-400 block mb-1">Session length (days)</label>
            <Input
              type="number"
              value={settings.sessionLengthDays}
              onChange={(e) => setSettings({ ...settings, sessionLengthDays: Number(e.target.value) || 0 })}
            />
          </div>
        </GlassCard>

        <GlassCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Storage</h2>
          <div>
            <label className="text-xs text-gray-400 block mb-1">Max upload size (MB)</label>
            <Input
              type="number"
              value={settings.maxUploadMb}
              onChange={(e) => setSettings({ ...settings, maxUploadMb: Number(e.target.value) || 0 })}
            />
          </div>
          <p className="text-xs text-gray-500">
            Note: this value is stored and displayed here but not yet enforced by the upload
            middleware (`middleware/upload.ts` uses a fixed 20MB limit) — wiring this setting
            into that limit is a small follow-up, not done in this pass.
          </p>
        </GlassCard>

        <GlassCard className="p-4 space-y-2">
          <h2 className="text-sm font-semibold text-white mb-1">Environment</h2>
          <p className="text-xs text-gray-500">
            Read-only, for reference — actual values are in <code>backend/.env</code> on the
            server, never exposed to the browser or stored in the settings table.
          </p>
          <div className="text-xs text-gray-400 space-y-1 mt-2">
            <p>DATABASE_URL — configured server-side</p>
            <p>JWT_SECRET — configured server-side</p>
            <p>AI provider keys (OpenAI/Anthropic/Gemini/etc.) — configured server-side</p>
          </div>
        </GlassCard>

        <GlassCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Feature flags</h2>
          <ToggleRow
            label="Deep Research"
            checked={settings.featureFlags.deepResearch}
            onChange={(v) => setSettings({ ...settings, featureFlags: { ...settings.featureFlags, deepResearch: v } })}
          />
          <ToggleRow
            label="AI Agents"
            checked={settings.featureFlags.agents}
            onChange={(v) => setSettings({ ...settings, featureFlags: { ...settings.featureFlags, agents: v } })}
          />
          <ToggleRow
            label="Automation"
            checked={settings.featureFlags.automation}
            onChange={(v) => setSettings({ ...settings, featureFlags: { ...settings.featureFlags, automation: v } })}
          />
          <ToggleRow
            label="Voice conversation mode"
            checked={settings.featureFlags.voiceMode}
            onChange={(v) => setSettings({ ...settings, featureFlags: { ...settings.featureFlags, voiceMode: v } })}
          />
          <p className="text-xs text-gray-500">
            Note: these flags are stored and displayed here but not yet read anywhere else in
            the app — each page/route would need to check them before this actually gates
            access, which is a follow-up, not done in this pass.
          </p>
        </GlassCard>

        <GlassCard className="p-4 space-y-3">
          <h2 className="text-sm font-semibold text-white">Subscription Pricing</h2>
          <p className="text-xs text-gray-500">
            Monthly price shown on the Pricing page — every new signup gets a 2-month free
            trial regardless of these values (shows ₹0/month during the trial).
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 block mb-1">Pro (₹/month)</label>
              <Input
                type="number"
                value={settings.proPriceInr}
                onChange={(e) => setSettings({ ...settings, proPriceInr: Number(e.target.value) || 0 })}
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 block mb-1">Ultra (₹/month)</label>
              <Input
                type="number"
                value={settings.ultraPriceInr}
                onChange={(e) => setSettings({ ...settings, ultraPriceInr: Number(e.target.value) || 0 })}
              />
            </div>
          </div>
        </GlassCard>

        <Button onClick={onSave} disabled={saving}>
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save settings"}
        </Button>
      </div>
    </AdminShell>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-gray-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition relative ${checked ? "bg-accent-purple" : "bg-white/10"}`}
      >
        <span
          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition ${
            checked ? "left-5" : "left-0.5"
          }`}
        />
      </button>
    </div>
  );
}
