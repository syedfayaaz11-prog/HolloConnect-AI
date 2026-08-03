"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, FolderKanban, MessageSquare, Pencil, Trash2, Check, X, Loader2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button, Input } from "@/components/ui/primitives";
import { ProjectWithChats, deleteProject, getProject, renameProject } from "@/lib/projects";

export default function ProjectDetailPage() {
  const { user, checking } = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [project, setProject] = useState<ProjectWithChats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (checking) return;
    getProject(params.id)
      .then((p) => {
        setProject(p);
        setEditingName(p.name);
      })
      .catch((err) => setError(err.message));
  }, [checking, params.id]);

  async function onRename(e: FormEvent) {
    e.preventDefault();
    if (!project || !editingName.trim()) return;
    setRenaming(true);
    try {
      const updated = await renameProject(project.id, editingName.trim());
      setProject({ ...project, name: updated.name });
      setIsEditing(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setRenaming(false);
    }
  }

  async function onDelete() {
    if (!project) return;
    setDeleting(true);
    try {
      await deleteProject(project.id);
      router.push("/projects");
    } catch (err) {
      setError((err as Error).message);
      setDeleting(false);
    }
  }

  if (checking || !project) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-500 gap-2">
        <Loader2 size={16} className="animate-spin" />
        Loading…
      </div>
    );
  }

  return (
    <AppShell user={user}>
      <div className="max-w-3xl mx-auto w-full px-6 py-8 space-y-6">
        <Link
          href="/projects"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft size={13} />
          Back to Projects
        </Link>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between gap-3"
        >
          {isEditing ? (
            <form onSubmit={onRename} className="flex gap-2 flex-1 mr-4">
              <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
              <Button type="submit" disabled={renaming} className="shrink-0 flex items-center gap-1.5">
                <Check size={13} />
                {renaming ? "Saving…" : "Save"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsEditing(false)}
                className="shrink-0 flex items-center gap-1.5"
              >
                <X size={13} />
                Cancel
              </Button>
            </form>
          ) : (
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-accent-gradient shadow-glow-sm flex items-center justify-center shrink-0">
                <FolderKanban size={18} className="text-white" />
              </div>
              <button
                onClick={() => setIsEditing(true)}
                title="Click to rename"
                className="flex items-center gap-2 min-w-0 group"
              >
                <h1 className="text-xl font-semibold text-white tracking-tight truncate">{project.name}</h1>
                <Pencil size={13} className="text-gray-500 group-hover:text-gray-300 transition-colors shrink-0" />
              </button>
            </div>
          )}

          {!isEditing && (
            <Button
              variant="ghost"
              onClick={onDelete}
              disabled={deleting}
              className="shrink-0 flex items-center gap-1.5 text-red-400 hover:text-red-300"
            >
              <Trash2 size={13} />
              {deleting ? "Deleting…" : "Delete"}
            </Button>
          )}
        </motion.div>

        <GlassCard>
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare size={15} className="text-accent-violet" />
            <h2 className="text-sm font-semibold text-white">Chats in this project</h2>
          </div>
          {project.chats.length === 0 ? (
            <p className="text-sm text-gray-500">
              No chats assigned yet. Start a chat and move it here from the chat menu.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {project.chats.map((chat, i) => (
                <motion.li
                  key={chat.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: i * 0.02, ease: [0.16, 1, 0.3, 1] }}
                >
                  <Link
                    href={`/chat?id=${chat.id}`}
                    className="flex items-center justify-between rounded-xl px-3.5 py-2.5 text-sm text-gray-200 hover:bg-white/[0.06] transition-colors duration-200"
                  >
                    <span className="truncate">{chat.title}</span>
                    <span className="text-xs text-gray-500 ml-2 shrink-0 rounded-md bg-white/[0.06] px-2 py-0.5">
                      {chat.model}
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          )}
        </GlassCard>
      </div>
    </AppShell>
  );
}
