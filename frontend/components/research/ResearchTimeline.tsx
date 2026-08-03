import { GlassCard } from "@/components/ui/primitives";
import { TimelineStep } from "@/lib/research";

export function ResearchTimeline({ steps }: { steps: TimelineStep[] }) {
  if (steps.length === 0) return null;

  return (
    <GlassCard>
      <h2 className="text-sm font-semibold text-white mb-4">Research timeline</h2>
      <ol className="space-y-4">
        {steps.map((s, i) => (
          <li key={i} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span className="w-2 h-2 rounded-full bg-accent-purple mt-1.5" />
              {i < steps.length - 1 && <span className="flex-1 w-px bg-white/10 mt-1" />}
            </div>
            <div className="pb-2">
              <p className="text-sm text-gray-200">{s.step}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.description}</p>
              <p className="text-[10px] text-gray-600 mt-0.5">
                {new Date(s.timestamp).toLocaleTimeString()}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </GlassCard>
  );
}
