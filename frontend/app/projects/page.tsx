"use client";

import { FormEvent, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FolderKanban, Sparkles, Plus, Compass } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { useRequireAuth } from "@/hooks/useRequireAuth";
import { GlassCard, Button, Input, Skeleton } from "@/components/ui/primitives";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { Project, createProject, listProjects } from "@/lib/projects";
import { PageLoadingScreen } from "@/components/layout/PageLoadingScreen";

const PROJECT_TEMPLATES = ["Product Launch", "Research Notes", "Client Work", "Personal Journal"];

export default function ProjectsPage() {
  const { user, checking } = useRequireAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (checking) return;
    listProjects()
      .then(setProjects)
      .catch((err) => setError(err.message))
      .finally(() => setInitialLoading(false));
  }, [checking]);

  async function create(projectName: string) {
    if (!projectName.trim() || creating) return;
    setCreating(true);
    setError(null);
    try {
      const project = await createProject(projectName.trim());
      setProjects((prev) => [project, ...prev]);
      setName("");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(false);
    }
  }

  function onCreate(e: FormEvent) {
    e.preventDefault();
    create(name);
  }

  if (checking) {
    return <PageLoadingScreen />;
  }

  return (
    <AppShell user={user}>
      <div className="max-w-4xl mx-auto w-full px-6 py-10 space-y-8 min-h-full flex flex-col justify-center">
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3.5"
        >
          <div className="w-11 h-11 rounded-2xl bg-accent-gradient shadow-glow-sm flex items-center justify-center shrink-0">
            <FolderKanban size={19} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white tracking-tight">Projects</h1>
            <p className="text-sm text-gray-400 flex items-center gap-1.5 mt-0.5">
              <Sparkles size={12} className="text-accent-violet" />
              Organize chats, files, and prompts together
            </p>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}>
          <GlassCard className="p-6">
            <form onSubmit={onCreate} className="flex gap-2.5">
              <Input
                placeholder="New project name…"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-11"
              />
              <Button
                type="submit"
                disabled={creating || !name.trim()}
                className="shrink-0 h-11 flex items-center gap-1.5 px-5"
              >
                <Plus size={15} className={creating ? "animate-spin" : ""} />
                {creating ? "Creating…" : "Create"}
              </Button>
            </form>
            {projects.length === 0 && !initialLoading && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-white/[0.06] flex-wrap">
                <Compass size={12} className="text-gray-500 shrink-0" />
                <span className="text-[11px] text-gray-500 mr-0.5">Quick start:</span>
                {PROJECT_TEMPLATES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => create(t)}
                    disabled={creating}
                    className="text-[11px] rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/[0.06] hover:border-white/[0.12] px-3 py-1.5 text-gray-400 hover:text-white transition-all duration-150 disabled:opacity-50"
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}
          </GlassCard>
        </motion.div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        {initialLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[104px] rounded-xl2" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="flex flex-col items-center text-center py-10"
          >
            <div className="w-14 h-14 rounded-2xl bg-accent-gradient-soft border border-white/[0.06] flex items-center justify-center mb-4">
              <FolderKanban size={24} className="text-accent-violet" />
            </div>
            <p className="text-sm text-gray-300 font-medium mb-1">No projects yet</p>
            <p className="text-xs text-gray-500 max-w-[280px] leading-relaxed">
              Create one above, or tap a quick-start idea to begin organizing your work.
            </p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AnimatePresence mode="popLayout">
              {projects.map((p) => (
                <ProjectCard key={p.id} project={p} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </AppShell>
  );
}
