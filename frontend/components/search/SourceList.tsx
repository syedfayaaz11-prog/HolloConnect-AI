import { GlassCard } from "@/components/ui/primitives";

export interface CitableSource {
  title: string;
  url: string;
  snippet?: string;
}

export function SourceList({ sources }: { sources: CitableSource[] }) {
  if (sources.length === 0) return null;

  return (
    <GlassCard>
      <h2 className="text-sm font-semibold text-white mb-3">Sources</h2>
      <ul className="space-y-3">
        {sources.map((s, i) => {
          let domain = s.url;
          try {
            domain = new URL(s.url).hostname.replace("www.", "");
          } catch {
            // leave as-is if URL parsing fails
          }
          return (
            <li key={s.url + i} className="text-sm">
              <span className="text-gray-500 mr-1">[{i + 1}]</span>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent-purple hover:underline"
              >
                {s.title}
              </a>
              <p className="text-xs text-gray-500 mt-0.5">{domain}</p>
            </li>
          );
        })}
      </ul>
    </GlassCard>
  );
}
