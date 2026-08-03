"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Sparkles, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AVAILABLE_MODELS } from "@/types";

function ModelSelectorImpl({
  value,
  onChange,
}: {
  value: string;
  onChange: (model: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = AVAILABLE_MODELS.find((m) => m.id === value) ?? AVAILABLE_MODELS[0];

  const groups = useMemo(() => {
    const map = new Map<string, typeof AVAILABLE_MODELS[number][]>();
    for (const m of AVAILABLE_MODELS) {
      const list = map.get(m.group) ?? [];
      list.push(m);
      map.set(m.group, list);
    }
    return Array.from(map.entries());
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="glass glass-hover rounded-xl px-3 py-2 text-sm text-gray-200 flex items-center gap-2 transition-colors duration-150"
      >
        <Sparkles size={13} className="text-accent-violet" />
        {current.label}
        <ChevronDown size={14} className={`text-gray-500 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            className="absolute right-0 mt-2 w-64 rounded-2xl border border-white/[0.09] bg-[#0d0d16]/95 backdrop-blur-2xl shadow-[0_20px_60px_-10px_rgba(0,0,0,0.55),0_0_0_1px_rgba(255,255,255,0.03)] p-2 z-20 max-h-[70vh] overflow-y-auto"
          >
            {groups.map(([group, models], i) => (
              <div key={group} className={i > 0 ? "mt-1 pt-1 border-t border-white/[0.06]" : ""}>
                <p className="text-[10px] uppercase tracking-wider text-gray-500 font-semibold px-2.5 py-1.5">
                  {group}
                </p>
                {models.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      onChange(m.id);
                      setOpen(false);
                    }}
                    className={`w-full text-left rounded-xl px-2.5 py-2 text-sm transition-colors duration-150 flex items-center justify-between gap-2 ${
                      m.id === value ? "bg-white/[0.09] text-white" : "text-gray-300 hover:bg-white/[0.06]"
                    }`}
                  >
                    {m.label}
                    {m.id === value && <Check size={13} className="text-accent-violet shrink-0" />}
                  </button>
                ))}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const ModelSelector = memo(ModelSelectorImpl);
