import { getCompletion } from "./ai.service";
import { fetchWebResults, WebSearchResult } from "./websearch.service";

export interface SearchAnswer {
  answer: string;
  followUps: string[];
  sources: WebSearchResult[];
}

const SYSTEM_PROMPT = `You are HolloConnect AI's search assistant. You are given a user query and
a numbered list of live web search results. Write a concise, well-organized answer that
directly addresses the query, citing sources inline using bracketed numbers like [1] or [2]
that correspond to the result numbers given. Only cite a source for claims it actually
supports. If the results don't fully answer the query, say so plainly rather than guessing.

Respond with ONLY a JSON object, no markdown fences, no preamble, in this exact shape:
{"answer": "...markdown text with [1] style citations...", "followUps": ["question 1", "question 2", "question 3"]}`;

export async function runSearch(query: string, model: string): Promise<SearchAnswer> {
  const results = await fetchWebResults(query);

  if (results.length === 0) {
    return {
      answer:
        "I couldn't find any live web results for this query. Try rephrasing it or being more specific.",
      followUps: [],
      sources: [],
    };
  }

  const sourceList = results
    .map((r, i) => `[${i + 1}] ${r.title}\n${r.url}\n${r.snippet}`)
    .join("\n\n");

  const raw = await getCompletion(model, [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `Query: ${query}\n\nSearch results:\n\n${sourceList}` },
  ]);

  const parsed = parseModelJson(raw);

  return {
    answer: parsed.answer,
    followUps: parsed.followUps,
    sources: results,
  };
}

function parseModelJson(raw: string): { answer: string; followUps: string[] } {
  // Models occasionally wrap JSON in markdown fences despite instructions — strip defensively.
  const cleaned = raw.trim().replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");
  try {
    const parsed = JSON.parse(cleaned);
    return {
      answer: typeof parsed.answer === "string" ? parsed.answer : cleaned,
      followUps: Array.isArray(parsed.followUps) ? parsed.followUps.filter((f: unknown) => typeof f === "string") : [],
    };
  } catch {
    // Model didn't return valid JSON — fall back to using the raw text as the answer
    // rather than failing the whole request.
    return { answer: cleaned, followUps: [] };
  }
}
