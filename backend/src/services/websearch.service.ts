/**
 * Live web search abstraction. Default provider is Tavily (built for LLM apps —
 * returns clean title/url/content triples, no HTML scraping needed).
 *
 * To swap or add a provider, implement the same WebSearchResult[] contract and
 * branch on an env var here, the same pattern used in ai.service.ts for models.
 */

export interface WebSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export async function fetchWebResults(
  query: string,
  maxResults = 6
): Promise<WebSearchResult[]> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Web search is not configured. Set TAVILY_API_KEY in backend/.env (get one at tavily.com)."
    );
  }

  const response = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      api_key: apiKey,
      query,
      max_results: maxResults,
      search_depth: "advanced",
    }),
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`Web search request failed: ${response.status} ${text}`);
  }

  const data = await response.json();
  const results = Array.isArray(data.results) ? data.results : [];

  return results.map((r: { title?: string; url: string; content?: string }) => ({
    title: r.title || r.url,
    url: r.url,
    snippet: (r.content || "").slice(0, 600),
  }));
}
