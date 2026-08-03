import { GlassCard } from "@/components/ui/primitives";

export function AdminStatCard({
  label,
  value,
  sublabel,
  tone = "default",
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: "default" | "good" | "bad" | "warn";
}) {
  const toneClass =
    tone === "good"
      ? "text-green-400"
      : tone === "bad"
        ? "text-red-400"
        : tone === "warn"
          ? "text-yellow-400"
          : "text-white";

  return (
    <GlassCard className="p-5">
      <p className="text-xs text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${toneClass}`}>{value}</p>
      {sublabel && <p className="text-xs text-gray-500 mt-1">{sublabel}</p>}
    </GlassCard>
  );
}
