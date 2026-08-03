"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Search, Pin } from "lucide-react";
import { Input } from "@/components/ui/primitives";
import { MEMORY_TYPES, MemoryType, listMemoryCategories, listMemoryTags } from "@/lib/memory";

export interface MemoryFilterState {
  query: string;
  type: MemoryType | "";
  category: string;
  tag: string;
  pinnedOnly: boolean;
}

export function MemoryFilterBar({
  filters,
  onChange,
}: {
  filters: MemoryFilterState;
  onChange: (next: MemoryFilterState) => void;
}) {
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);

  useEffect(() => {
    listMemoryCategories().then(setCategories).catch(() => {});
    listMemoryTags().then(setTags).catch(() => {});
  }, []);

  function set<K extends keyof MemoryFilterState>(key: K, value: MemoryFilterState[K]) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" />
        <Input
          value={filters.query}
          onChange={(e) => set("query", e.target.value)}
          placeholder="Search memories…"
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <FilterPill label="All types" active={filters.type === ""} onClick={() => set("type", "")} />
        {MEMORY_TYPES.map((t) => (
          <FilterPill key={t} label={t} active={filters.type === t} onClick={() => set("type", t)} />
        ))}
      </div>

      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterPill label="All categories" active={filters.category === ""} onClick={() => set("category", "")} />
          {categories.map((c) => (
            <FilterPill key={c} label={c} active={filters.category === c} onClick={() => set("category", c)} />
          ))}
        </div>
      )}

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <FilterPill label="All tags" active={filters.tag === ""} onClick={() => set("tag", "")} />
          {tags.map((t) => (
            <FilterPill key={t} label={`#${t}`} active={filters.tag === t} onClick={() => set("tag", t)} />
          ))}
        </div>
      )}

      <FilterPill
        icon={<Pin size={11} className={filters.pinnedOnly ? "fill-current" : ""} />}
        label="Pinned only"
        active={filters.pinnedOnly}
        onClick={() => set("pinnedOnly", !filters.pinnedOnly)}
      />
    </div>
  );
}

function FilterPill({
  label,
  active,
  onClick,
  icon,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      className={`flex items-center gap-1.5 text-xs rounded-lg px-3 py-1.5 border transition-colors duration-200 ${
        active
          ? "bg-accent-gradient text-white border-transparent shadow-glow-sm"
          : "bg-white/[0.04] border-white/10 text-gray-300 hover:bg-white/[0.08] hover:border-white/20"
      }`}
    >
      {icon}
      {label}
    </motion.button>
  );
}
