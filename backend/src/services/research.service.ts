import { getCompletion } from "./ai.service";
import { fetchWebResults, WebSearchResult } from "./websearch.service";

export interface TimelineStep {
  step: string;
  description: string;
  timestamp: string;
}

export interface ResearchResult {
  sections: { heading: string; content: string }[];
  sources: WebSearchResult[];
  followUps: string[];
  timeline: TimelineStep[];
}

const PLAN_PROMPT = `You are a research planner. Given a research topic, break it into 3-5 focused
sub-questions that together would produce a thorough report on the topic. Respond with ONLY a
JSON array of strings, no markdown fences, no preamble. Example: ["question 1", "question 2"]`;

const SYNTHESIS_PROMPT = `You are HolloConnect AI's deep research assistant. You are given a
research topic and numbered source excerpts gathered from multiple web searches. Write a
thorough, well-structured research report as a JSON object with this exact shape, no markdown
fences, no preamble:
{
  "sections": [{"heading": "...", "content": "...markdown with [n] citations..."}],
  "followUps": ["question 1", "question 2", "question 3"]
}
Use 3-6 sections (e.g. Overview, key findings, considerations, conclusion — adapt headings to
the topic). Cite sources inline with bracketed numbers matching the excerpt numbers given. Do
not fabricate claims beyond what the sources support.`;

/**
 * Runs the full research pipeline synchronously: plan -> multi-query search -> synthesize.
 * This is a single request/response for now; a queue-based version (progress streamed to the
 * client as each step completes) is a natural follow-up once the Automation module's job
 * queue exists — see PROJECT_PROGRESS.md.
 */
export async function runDeepResearch(
  topic: string,
  model: string,
  onStep?: (step: TimelineStep) => void
): Promise<ResearchResult> {
  const timeline: TimelineStep[] = [];
  const record = (step: string, description: string) => {
    const entry = { step, description, timestamp: new Date().toISOString() };
    timeline.push(entry);
    onStep?.(entry);
  };

  record("Planning", `Breaking "${topic}" into focused sub-questions`);
  const subQuestions = await planSubQuestions(topic, model);

  const allResults: WebSearchResult[] = [];
  for (const q of subQuestions) {
    record("Searching", `Searching the web for: ${q}`);
    try {
      const results = await fetchWebResults(q, 5);
      allResults.push(...results);
    } catch (err) {
      // One failed sub-search shouldn't sink the whole report — log the gap in the
      // timeline and continue with whatever sources we do have.
      record("Search failed", `Could not fetch results for "${q}": ${(err as Error).message}`);
    }
  }

  const dedupedSources = dedupeByUrl(allResults);
  if (dedupedSources.length === 0) {
    throw new Error(
      "No web results could be gathered for this topic. Check that TAVILY_API_KEY is configured."
    );
  }

  record("Synthesizing", `Writing the report from ${dedupedSources.length} sources`);
  const report = await synthesizeReport(topic, dedupedSources, model);

  record("Complete", "Report finished");

  return { ...report, sources: dedupedSources, timeline };
}

async function planSubQuestions(topic: string, model: string): Promise<string[]> {
  const raw = await getCompletion(model, [
    { role: "system", content: PLAN_PROMPT },
    { role: "user", content: topic },
  ]);
  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed) && parsed.every((q) => typeof q === "string") && parsed.length > 0) {
      return parsed.slice(0, 5);
    }
  } catch {
    // fall through to default
  }
  // If planning fails to produce valid JSON, fall back to researching the topic directly
  // rather than failing the whole pipeline.
  return [topic];
}

async function synthesizeReport(
  topic: string,
  sources: WebSearchResult[],
  model: string
): Promise<{ sections: { heading: string; content: string }[]; followUps: string[] }> {
  const sourceList = sources
    .map((s, i) => `[${i + 1}] ${s.title}\n${s.url}\n${s.snippet}`)
    .join("\n\n");

  const raw = await getCompletion(model, [
    { role: "system", content: SYNTHESIS_PROMPT },
    { role: "user", content: `Topic: ${topic}\n\nSource excerpts:\n\n${sourceList}` },
  ]);

  const cleaned = stripFences(raw);
  try {
    const parsed = JSON.parse(cleaned);
    return {
      sections: Array.isArray(parsed.sections) ? parsed.sections : [{ heading: "Report", content: cleaned }],
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.filter((f: unknown) => typeof f === "string") : [],
    };
  } catch {
    return { sections: [{ heading: "Report", content: cleaned }], followUps: [] };
  }
}

function dedupeByUrl(results: WebSearchResult[]): WebSearchResult[] {
  const seen = new Set<string>();
  const out: WebSearchResult[] = [];
  for (const r of results) {
    if (seen.has(r.url)) continue;
    seen.add(r.url);
    out.push(r);
  }
  return out;
}

function stripFences(raw: string): string {
  return raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
}
