import { GlassCard } from "@/components/ui/primitives";
import { Markdown } from "@/components/ui/Markdown";

export function AnswerPanel({ answer, model }: { answer: string; model: string }) {
  return (
    <GlassCard>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white">AI Answer</h2>
        <span className="text-xs text-gray-500">{model}</span>
      </div>
      <Markdown>{answer}</Markdown>
    </GlassCard>
  );
}
