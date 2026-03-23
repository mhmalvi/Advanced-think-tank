import { logger } from "@/lib/logger";
import { en } from "@/lib/i18n/en";
import { da } from "@/lib/i18n/da";
import { RAG_QUERY_TIMEOUT_MS, WEB_SEARCH_TIMEOUT_MS } from "@/lib/constants";

const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL || "";
const WEBHOOK_SECRET = import.meta.env.VITE_WEBHOOK_SECRET || "";
const MAX_RETRIES = 2;
const RETRY_DELAY_MS = 1000;

const errorTranslations = { en, da } as const;

type ErrorKey = keyof typeof en.errors;

/** Looks up a locale-aware error message (da/en) by key, defaulting to Danish. */
function getErrorMessage(key: ErrorKey, locale: string): string {
  const lang = locale in errorTranslations ? (locale as keyof typeof errorTranslations) : "da";
  return errorTranslations[lang].errors[key];
}

/** Waits for the specified number of milliseconds. */
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

if (!N8N_WEBHOOK_URL && import.meta.env.MODE === "production") {
  logger.warn("VITE_N8N_WEBHOOK_URL is not set — RAG queries will fail");
}

export type RagResponse = {
  query_id: string;
  analysis: {
    content: string;
    confidence: number;
    primary_source_count: number;
    supporting_source_count: number;
  };
  citations: {
    article_id: string;
    title: string;
    source_name: string;
    source_slug: string;
    published_at: string;
    url: string;
    excerpt: string;
    relevance_score: number;
    position: number;
  }[];
};

export type WebSearchResult = {
  title: string;
  url: string;
  content: string;
  source: string;
  score: number;
  published_date: string;
};

export type WebSearchResponse = {
  query_id: string;
  query_text: string;
  web_results: WebSearchResult[];
  result_count: number;
};

/** Builds request headers, including the optional x-webhook-secret if VITE_WEBHOOK_SECRET is set. */
function buildHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (WEBHOOK_SECRET) {
    headers["x-webhook-secret"] = WEBHOOK_SECRET;
  }
  return headers;
}

/**
 * Calls the n8n RAG webhook with a 30s abort timeout. Returns the structured analysis and citations.
 * Throws locale-aware errors on timeout, bad response, or missing webhook config.
 */
export async function queryRagPipeline(
  queryText: string,
  queryId: string,
  locale: string = "da",
): Promise<RagResponse> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error(getErrorMessage("webhookNotConfigured", locale));
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      logger.warn(`RAG query retry ${attempt}/${MAX_RETRIES}`);
      await delay(RETRY_DELAY_MS * attempt);
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), RAG_QUERY_TIMEOUT_MS);

    try {
      const res = await fetch(`${N8N_WEBHOOK_URL}/jaegeren-query`, {
        method: "POST",
        headers: buildHeaders(),
        body: JSON.stringify({ query_text: queryText, query_id: queryId, locale }),
        signal: controller.signal,
        keepalive: true,
      });

      clearTimeout(timeout);

      if (!res.ok) {
        lastError = new Error(getErrorMessage("ragPipelineError", locale));
        continue;
      }

      // Read response as text first to validate before JSON parsing
      const text = await res.text();
      if (!text || text.trim().length === 0) {
        lastError = new Error(getErrorMessage("invalidResponse", locale));
        continue;
      }

      let data: unknown;
      try {
        data = JSON.parse(text);
      } catch {
        logger.error("RAG pipeline returned invalid JSON", { length: text.length, preview: text.slice(0, 100) });
        lastError = new Error(getErrorMessage("invalidResponse", locale));
        continue;
      }

      if (!data || typeof (data as RagResponse).analysis?.content !== "string") {
        lastError = new Error("Invalid RAG response structure");
        continue;
      }
      return data as RagResponse;
    } catch (e) {
      clearTimeout(timeout);
      if (e instanceof DOMException && e.name === "AbortError") {
        lastError = new Error(getErrorMessage("timeout", locale), { cause: e });
        continue;
      }
      throw e;
    }
  }

  throw lastError ?? new Error(getErrorMessage("ragPipelineError", locale));
}

/** Calls the n8n web search webhook (15s timeout). Degrades gracefully — returns empty results on any failure. */
export async function queryWebSearch(queryText: string, queryId: string): Promise<WebSearchResponse> {
  if (!N8N_WEBHOOK_URL) {
    return { query_id: queryId, query_text: queryText, web_results: [], result_count: 0 };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), WEB_SEARCH_TIMEOUT_MS);

    const res = await fetch(`${N8N_WEBHOOK_URL}/jaegeren-websearch`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({ query_text: queryText, query_id: queryId }),
      signal: controller.signal,
      keepalive: true,
    });

    clearTimeout(timeout);

    if (!res.ok) return { query_id: queryId, query_text: queryText, web_results: [], result_count: 0 };

    // Read as text first to avoid "Unexpected end of JSON input" on truncated responses
    const text = await res.text();
    if (!text || text.trim().length === 0) {
      logger.error("Web search returned empty response");
      return { query_id: queryId, query_text: queryText, web_results: [], result_count: 0 };
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      logger.error("Web search returned invalid JSON", { length: text.length });
      return { query_id: queryId, query_text: queryText, web_results: [], result_count: 0 };
    }

    return data as WebSearchResponse;
  } catch (e) {
    logger.error("Web search failed", { error: e instanceof Error ? e.message : String(e) });
    return { query_id: queryId, query_text: queryText, web_results: [], result_count: 0 };
  }
}

// ─── V3: Search API ───

import { supabase } from "@/lib/supabase";
import type { Story } from "@/types/database";

/** Search stories by splitting query into words and matching any word against title, cluster_topic, or synopsis. Returns best match or null. */
export async function searchStories(query: string): Promise<Story | null> {
  const words = query
    .replace(/[%,()]/g, "")
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  if (words.length === 0) return null;

  // Build OR filter: each word matches against title, cluster_topic, or synopsis
  const filters = words.flatMap((w) => {
    const p = `%${w}%`;
    return [`title.ilike.${p}`, `cluster_topic.ilike.${p}`, `synopsis.ilike.${p}`];
  });

  const { data, error } = await supabase
    .from("stories")
    .select("*")
    .or(filters.join(","))
    .order("source_count", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    console.error("searchStories error:", error.message);
    return null;
  }

  return (data?.[0] as Story) ?? null;
}

/** Save a search query to search_history table. */
export async function saveSearchHistory(userId: string, query: string, storyId?: string): Promise<void> {
  await supabase.from("search_history").insert({
    user_id: userId,
    query,
    result_story_id: storyId ?? null,
  });
}

/** Fetch the user's most recent searches. */
export async function fetchRecentSearches(userId: string, limit: number = 5): Promise<string[]> {
  const { data } = await supabase
    .from("search_history")
    .select("query")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => row.query as string);
}

// ─── V3: Canvas Chat API ───

export type CanvasChatResponse = {
  response: string;
  story_id: string;
};

/**
 * Sends a chat message to the canvas chat n8n webhook.
 * Returns the AI response text (may contain <story_update> tags).
 */
export async function canvasChatMessage(
  storyId: string,
  userMessage: string,
  storyContent: string,
  chatHistory: { role: string; content: string }[],
): Promise<CanvasChatResponse> {
  if (!N8N_WEBHOOK_URL) {
    throw new Error("Chat service is not configured");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45_000);

  try {
    const res = await fetch(`${N8N_WEBHOOK_URL}/jaegeren-canvas-chat`, {
      method: "POST",
      headers: buildHeaders(),
      body: JSON.stringify({
        story_id: storyId,
        user_message: userMessage,
        story_content: storyContent,
        chat_history: chatHistory,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!res.ok) {
      throw new Error("Chat request failed");
    }

    const text = await res.text();
    if (!text || text.trim().length === 0) {
      throw new Error("Empty chat response");
    }

    let data: unknown;
    try {
      data = JSON.parse(text);
    } catch {
      // If not JSON, treat the raw text as the response
      return { response: text, story_id: storyId };
    }

    const parsed = data as Record<string, unknown>;
    return {
      response: (parsed.response as string) ?? text,
      story_id: storyId,
    };
  } catch (e) {
    clearTimeout(timeout);
    if (e instanceof DOMException && e.name === "AbortError") {
      throw new Error("The analysis is taking longer than expected. Want me to try again?", { cause: e });
    }
    throw e;
  }
}
