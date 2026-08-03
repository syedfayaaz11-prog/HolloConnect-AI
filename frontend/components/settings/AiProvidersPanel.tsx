"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Key, Plus, Trash2, Pencil, Zap, Loader2, Star, X } from "lucide-react";
import { GlassCard, Button, Input } from "@/components/ui/primitives";
import { fetchMe } from "@/lib/auth";
import { updateProfile } from "@/lib/settings";
import { AVAILABLE_MODELS } from "@/types";
import {
  ApiKey,
  ApiKeyProvider,
  ApiKeyStatus,
  createApiKey,
  deleteApiKey,
  listApiKeys,
  testApiKey,
  updateApiKey,
} from "@/lib/apiKeys";

const PROVIDER_META: Record<
  ApiKeyProvider,
  { label: string; short: string; needsKey: boolean; needsBaseUrl: boolean; baseUrlPlaceholder?: string; keyPlaceholder?: string }
> = {
  OPENAI: { label: "OpenAI", short: "OpenAI", needsKey: true, needsBaseUrl: false, keyPlaceholder: "sk-..." },
  ANTHROPIC: {
    label: "Anthropic Claude",
    short: "Claude",
    needsKey: true,
    needsBaseUrl: false,
    keyPlaceholder: "sk-ant-...",
  },
  GEMINI: { label: "Google Gemini", short: "Gemini", needsKey: true, needsBaseUrl: false, keyPlaceholder: "AIza..." },
  DEEPSEEK: { label: "DeepSeek", short: "DeepSeek", needsKey: true, needsBaseUrl: false, keyPlaceholder: "sk-..." },
  MISTRAL: { label: "Mistral", short: "Mistral", needsKey: true, needsBaseUrl: false, keyPlaceholder: "..." },
  XAI: { label: "xAI (Grok)", short: "Grok", needsKey: true, needsBaseUrl: false, keyPlaceholder: "xai-..." },
  OLLAMA: {
    label: "Ollama (Local)",
    short: "Ollama",
    needsKey: false,
    needsBaseUrl: true,
    baseUrlPlaceholder: "http://localhost:11434",
  },
  OPENAI_COMPATIBLE: {
    label: "OpenAI-compatible (OpenRouter, Groq, Together AI, custom...)",
    short: "Compatible",
    needsKey: true,
    needsBaseUrl: true,
    baseUrlPlaceholder: "https://openrouter.ai/api/v1",
    keyPlaceholder: "sk-or-...",
  },
};

const PROVIDER_ORDER: ApiKeyProvider[] = [
  "OPENAI",
  "ANTHROPIC",
  "GEMINI",
  "DEEPSEEK",
  "MISTRAL",
  "XAI",
  "OPENAI_COMPATIBLE",
  "OLLAMA",
];

function StatusDot({ status }: { status: ApiKeyStatus }) {
  const color = status === "VALID" ? "bg-emerald-400" : status === "INVALID" ? "bg-red-400" : "bg-gray-500";
  const title = status === "VALID" ? "Connected" : status === "INVALID" ? "Connection failed" : "Not tested yet";
  return <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} title={title} />;
}

/** Compact per-provider-type overview strip — separate from the individual key rows below,
    this answers "which of the 5 provider types do I actually have working?" at a glance
    without needing to scan every stored key. */
function ProviderStatusStrip({ keys }: { keys: ApiKey[] }) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-4">
      {PROVIDER_ORDER.map((provider) => {
        const providerKeys = keys.filter((k) => k.provider === provider);
        const hasValid = providerKeys.some((k) => k.status === "VALID");
        const hasAny = providerKeys.length > 0;
        const hasInvalidOnly = hasAny && !hasValid && providerKeys.every((k) => k.status === "INVALID");
        return (
          <span
            key={provider}
            className={`inline-flex items-center gap-1.5 text-[11px] font-medium rounded-full px-2.5 py-1 border ${
              hasValid
                ? "border-emerald-500/25 bg-emerald-500/10 text-emerald-300"
                : hasInvalidOnly
                  ? "border-red-500/25 bg-red-500/10 text-red-300"
                  : "border-white/10 bg-white/[0.03] text-gray-500"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                hasValid ? "bg-emerald-400" : hasInvalidOnly ? "bg-red-400" : "bg-gray-600"
              }`}
            />
            {PROVIDER_META[provider].short}
          </span>
        );
      })}
    </div>
  );
}

export function AiProvidersPanel() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [provider, setProvider] = useState<ApiKeyProvider>("OPENAI");
  const [label, setLabel] = useState("");
  const [apiKeyValue, setApiKeyValue] = useState("");
  const [baseUrl, setBaseUrl] = useState("");
  const [keyDefaultModel, setKeyDefaultModel] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [testingId, setTestingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [globalDefaultModel, setGlobalDefaultModel] = useState("");
  const [savingDefaultModel, setSavingDefaultModel] = useState(false);

  useEffect(() => {
    refresh();
    fetchMe().then((u) => {
      if (u?.defaultModel) setGlobalDefaultModel(u.defaultModel);
    });
  }, []);

  async function refresh() {
    setLoading(true);
    try {
      setKeys(await listApiKeys());
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function openAddForm() {
    setEditingId(null);
    setProvider("OPENAI");
    setLabel("");
    setApiKeyValue("");
    setBaseUrl("");
    setKeyDefaultModel("");
    setFormError(null);
    setFormOpen(true);
  }

  function openEditForm(key: ApiKey) {
    setEditingId(key.id);
    setProvider(key.provider);
    setLabel(key.label);
    setApiKeyValue("");
    setBaseUrl(key.baseUrl ?? "");
    setKeyDefaultModel(key.defaultModel ?? "");
    setFormError(null);
    setFormOpen(true);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      if (editingId) {
        await updateApiKey(editingId, {
          label,
          apiKey: apiKeyValue || undefined,
          baseUrl: baseUrl || undefined,
          defaultModel: keyDefaultModel || undefined,
        });
      } else {
        await createApiKey({
          provider,
          label,
          apiKey: apiKeyValue || undefined,
          baseUrl: baseUrl || undefined,
          defaultModel: keyDefaultModel || undefined,
        });
      }
      await refresh();
      setFormOpen(false);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function onDelete(id: string) {
    setDeletingId(id);
    try {
      await deleteApiKey(id);
      setKeys((prev) => prev.filter((k) => k.id !== id));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeletingId(null);
    }
  }

  async function onTest(id: string) {
    setTestingId(id);
    try {
      const { key } = await testApiKey(id);
      setKeys((prev) => prev.map((k) => (k.id === key.id ? key : k)));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setTestingId(null);
    }
  }

  async function onSetDefault(key: ApiKey) {
    setError(null);
    try {
      await updateApiKey(key.id, { isDefault: true });
      await refresh(); // other same-provider keys lose their default flag server-side too
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function onSaveGlobalDefaultModel() {
    setSavingDefaultModel(true);
    setError(null);
    try {
      await updateProfile({ defaultModel: globalDefaultModel.trim() });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingDefaultModel(false);
    }
  }

  const meta = PROVIDER_META[provider];

  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Key size={15} className="text-accent-violet" />
          <h2 className="text-sm font-semibold text-white">Providers &amp; API keys</h2>
        </div>
        {!formOpen && (
          <Button type="button" variant="ghost" onClick={openAddForm} className="flex items-center gap-1.5">
            <Plus size={13} />
            Add key
          </Button>
        )}
      </div>

      <p className="text-xs text-gray-500 leading-relaxed mb-4">
        Bring your own API key for OpenAI, Anthropic, Google Gemini, a local Ollama server, or
        any OpenAI-compatible provider (OpenRouter, Groq, Together AI, DeepSeek, and others) to
        use your own account for chat instead of HolloConnect's built-in models. Keys are
        encrypted at rest — the full value is never shown again after saving.
      </p>

      {!loading && <ProviderStatusStrip keys={keys} />}
      {error && <p className="text-xs text-red-400 mb-3">{error}</p>}

      <AnimatePresence initial={false}>
        {formOpen && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            onSubmit={onSubmit}
            className="overflow-hidden mb-4"
          >
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-gray-300">{editingId ? "Edit key" : "Add a new key"}</p>
                <button
                  type="button"
                  onClick={() => setFormOpen(false)}
                  className="text-gray-500 hover:text-gray-300 transition-colors"
                  aria-label="Cancel"
                >
                  <X size={14} />
                </button>
              </div>

              {!editingId && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Provider</label>
                  <select
                    value={provider}
                    onChange={(e) => setProvider(e.target.value as ApiKeyProvider)}
                    className="select-dark w-full glass rounded-lg px-3 py-2 text-sm text-gray-200 focus:outline-none focus:ring-2 focus:ring-accent-purple/60"
                  >
                    {PROVIDER_ORDER.map((p) => (
                      <option key={p} value={p}>
                        {PROVIDER_META[p].label}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 block mb-1">Label</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="e.g. Personal OpenAI key"
                  required
                />
              </div>

              {meta.needsKey && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    API key
                    {editingId && <span className="text-gray-600"> (leave blank to keep the current one)</span>}
                  </label>
                  <Input
                    type="password"
                    autoComplete="off"
                    value={apiKeyValue}
                    onChange={(e) => setApiKeyValue(e.target.value)}
                    placeholder={meta.keyPlaceholder}
                    required={!editingId}
                  />
                </div>
              )}

              {meta.needsBaseUrl && (
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Base URL</label>
                  <Input
                    value={baseUrl}
                    onChange={(e) => setBaseUrl(e.target.value)}
                    placeholder={meta.baseUrlPlaceholder}
                    required
                  />
                </div>
              )}

              <div>
                <label className="text-xs text-gray-500 block mb-1">Default model for this key (optional)</label>
                <Input
                  list="ai-provider-model-suggestions"
                  value={keyDefaultModel}
                  onChange={(e) => setKeyDefaultModel(e.target.value)}
                  placeholder="e.g. gpt-4o, claude-sonnet-4, llama3.3"
                />
              </div>

              {formError && <p className="text-xs text-red-400">{formError}</p>}

              <div className="flex items-center gap-2 pt-1">
                <Button type="submit" disabled={saving} className="flex items-center gap-1.5">
                  {saving && <Loader2 size={13} className="animate-spin" />}
                  {editingId ? "Save changes" : "Add key"}
                </Button>
                <Button type="button" variant="ghost" onClick={() => setFormOpen(false)} disabled={saving}>
                  Cancel
                </Button>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="space-y-2">
          <div className="skeleton animate-shimmer h-14 rounded-xl" />
          <div className="skeleton animate-shimmer h-14 rounded-xl" />
        </div>
      ) : keys.length === 0 ? (
        <p className="text-xs text-gray-500 italic py-2">
          No API keys added yet — HolloConnect's built-in models are used for chat.
        </p>
      ) : (
        <div className="space-y-2">
          {keys.map((key) => (
            <div
              key={key.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3.5 py-3"
            >
              <div className="min-w-0 flex items-start gap-3">
                <div className="mt-1.5">
                  <StatusDot status={key.status} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm text-gray-200 font-medium truncate">{key.label}</p>
                    {key.isDefault && (
                      <span className="text-[10px] rounded-md px-1.5 py-0.5 bg-accent-gradient-soft text-accent-violet font-medium shrink-0">
                        Default
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 truncate">
                    {PROVIDER_META[key.provider].short}
                    {key.keyPreview && ` · ${key.keyPreview}`}
                    {key.baseUrl && ` · ${key.baseUrl}`}
                    {key.defaultModel && ` · ${key.defaultModel}`}
                  </p>
                  {key.status === "INVALID" && key.lastError && (
                    <p className="text-[11px] text-red-400 mt-0.5">{key.lastError}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {!key.isDefault && (
                  <button
                    onClick={() => onSetDefault(key)}
                    title="Make default for this provider"
                    className="p-1.5 rounded-lg text-gray-500 hover:text-accent-violet hover:bg-white/5 transition-colors"
                  >
                    <Star size={13} />
                  </button>
                )}
                <button
                  onClick={() => onTest(key.id)}
                  disabled={testingId === key.id}
                  title="Test connection"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {testingId === key.id ? <Loader2 size={13} className="animate-spin" /> : <Zap size={13} />}
                </button>
                <button
                  onClick={() => openEditForm(key)}
                  title="Edit"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors"
                >
                  <Pencil size={13} />
                </button>
                <button
                  onClick={() => onDelete(key.id)}
                  disabled={deletingId === key.id}
                  title="Delete"
                  className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 hover:bg-white/5 transition-colors disabled:opacity-50"
                >
                  {deletingId === key.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="h-px bg-white/[0.06] my-4" />

      <div>
        <p className="text-sm text-gray-200 mb-1">Default model</p>
        <p className="text-xs text-gray-500 mb-3 leading-relaxed">
          Used for new chats unless a different model is picked per-conversation. Pick a
          built-in model, or type your own BYOK model id — an Ollama model prefixed like{" "}
          <code className="text-gray-400">ollama:llama3.3</code>, or any other model from your
          OpenAI-compatible provider prefixed like{" "}
          <code className="text-gray-400">custom:mistralai/mixtral-8x22b-instruct</code>.
        </p>
        <div className="flex items-center gap-2">
          <Input
            list="ai-provider-model-suggestions"
            value={globalDefaultModel}
            onChange={(e) => setGlobalDefaultModel(e.target.value)}
            placeholder="claude-sonnet-4"
            className="flex-1"
          />
          <Button type="button" onClick={onSaveGlobalDefaultModel} disabled={savingDefaultModel || !globalDefaultModel.trim()}>
            {savingDefaultModel ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <datalist id="ai-provider-model-suggestions">
        {AVAILABLE_MODELS.map((m) => (
          <option key={m.id} value={m.id} />
        ))}
      </datalist>
    </GlassCard>
  );
}
