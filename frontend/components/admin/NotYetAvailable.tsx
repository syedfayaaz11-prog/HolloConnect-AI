import { GlassCard } from "@/components/ui/primitives";

export function NotYetAvailable({
  title,
  reason,
}: {
  title: string;
  reason: string;
}) {
  return (
    <GlassCard className="p-8 text-center">
      <p className="text-sm text-gray-300 font-medium mb-2">{title}</p>
      <p className="text-xs text-gray-500 max-w-md mx-auto">{reason}</p>
    </GlassCard>
  );
}
