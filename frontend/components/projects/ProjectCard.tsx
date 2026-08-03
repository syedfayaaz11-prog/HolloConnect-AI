"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { FolderKanban, MessageSquare } from "lucide-react";
import { Project } from "@/lib/projects";

export function ProjectCard({ project }: { project: Project }) {
  const chatCount = project._count?.chats ?? 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
    >
      <Link href={`/projects/${project.id}`}>
        <div className="glass rounded-xl2 p-5 hover:bg-white/[0.07] hover:border-white/[0.16] hover:shadow-card transition-all duration-200 cursor-pointer group h-full">
          <div className="w-10 h-10 rounded-xl bg-accent-gradient-soft flex items-center justify-center mb-3.5 group-hover:scale-105 group-hover:shadow-glow-sm transition-all duration-200">
            <FolderKanban size={17} className="text-accent-violet" />
          </div>
          <p className="text-white font-medium truncate">{project.name}</p>
          <p className="flex items-center gap-1.5 text-xs text-gray-500 mt-1.5">
            <MessageSquare size={11} />
            {chatCount} chat{chatCount === 1 ? "" : "s"}
          </p>
        </div>
      </Link>
    </motion.div>
  );
}
