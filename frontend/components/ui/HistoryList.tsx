import Link from "next/link";
import { GlassCard } from "@/components/ui/primitives";

export interface HistoryItem {
  id: string;
  label: string;
  meta: string;
  href: string;
}

export function HistoryList({ items, emptyText }: { items: HistoryItem[]; emptyText: string }) {
  if (items.length === 0) {
    return <p className="text-sm text-gray-500">{emptyText}</p>;
  }

  return (
    <GlassCard className="p-4">
      <ul className="space-y-1">
        {items.map((item) => (
          <li key={item.id}>
            <Link
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-sm text-gray-200 hover:bg-white/5 transition"
            >
              <span className="truncate">{item.label}</span>
              <span className="text-xs text-gray-500 ml-2 shrink-0">{item.meta}</span>
            </Link>
          </li>
        ))}
      </ul>
    </GlassCard>
  );
}
