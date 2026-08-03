import { GlassCard } from "@/components/ui/primitives";
import { Markdown } from "@/components/ui/Markdown";
import { ResearchSection } from "@/lib/research";

export function ReportSections({ sections }: { sections: ResearchSection[] }) {
  return (
    <div className="space-y-4">
      {sections.map((section, i) => (
        <GlassCard key={i}>
          <h2 className="text-sm font-semibold text-white mb-3">{section.heading}</h2>
          <Markdown>{section.content}</Markdown>
        </GlassCard>
      ))}
    </div>
  );
}
