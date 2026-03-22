import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { FETCH_RECENT_ARTICLES_LIMIT, FETCH_RECENT_QUERIES_LIMIT } from "@/lib/constants";
import type { Source, RagQueryResult, RagAnalysis, RagCitation } from "@/types/database";

// ── Sources ────────────────────────────────────────────────────────────────

type RecentArticle = {
  id: string;
  title: string;
  source_name: string;
  published_at: string;
  url: string;
  excerpt: string | null;
  image_url: string | null;
};

function mapArticleRow(a: Record<string, unknown>): RecentArticle {
  return {
    id: a.id as string,
    title: a.title as string,
    source_name: (a.source as { name: string } | null)?.name ?? "",
    published_at: a.published_at as string,
    url: a.url as string,
    excerpt: (a.excerpt as string | null) ?? null,
    image_url: (a.image_url as string | null) ?? null,
  };
}

/** Fetch all active sources with live article counts (mirrors sourceSlice.fetchSources). */
export function useSources() {
  return useQuery({
    queryKey: ["sources"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("sources")
        .select("*, articles(count)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      const sources = (data ?? []).map((row: Record<string, unknown>) => {
        const articlesArr = row.articles as { count: number }[] | undefined;
        const liveCount = articlesArr?.[0]?.count ?? 0;
        return { ...row, article_count: liveCount } as Source;
      });
      return sources;
    },
  });
}

// ── Recent articles ────────────────────────────────────────────────────────

/** Fetch recent articles across all sources (mirrors sourceSlice.fetchRecentArticles). */
export function useRecentArticles() {
  return useQuery({
    queryKey: ["recentArticles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("articles")
        .select("id, title, published_at, url, excerpt, image_url, source:sources(name)")
        .order("published_at", { ascending: false })
        .limit(FETCH_RECENT_ARTICLES_LIMIT);
      if (error) throw error;
      return (data ?? []).map((a: Record<string, unknown>) => mapArticleRow(a));
    },
  });
}

// ── Recent queries ─────────────────────────────────────────────────────────

/** Fetch recent queries with analyses and citations (mirrors querySlice.fetchRecentQueries). */
export function useRecentQueries() {
  return useQuery({
    queryKey: ["recentQueries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("queries")
        .select(
          `
          *,
          analysis:analyses(
            *,
            citations(
              *,
              article:articles(*, source:sources(*))
            )
          )
        `,
        )
        .order("created_at", { ascending: false })
        .limit(FETCH_RECENT_QUERIES_LIMIT);
      if (error) throw error;

      // Supabase returns `analysis` as an array (1:many join). Extract first item.
      const mapped: RagQueryResult[] = (data ?? []).map((row: Record<string, unknown>) => {
        const analysisArr = row.analysis as Record<string, unknown>[] | null;
        const a = analysisArr?.[0];
        let analysis: RagAnalysis | null = null;

        if (a) {
          const citationsArr = (a.citations as Record<string, unknown>[]) ?? [];
          analysis = {
            id: a.id as string,
            query_id: a.query_id as string,
            content: a.content as string,
            confidence: a.confidence as number,
            primary_source_count: a.primary_source_count as number,
            supporting_source_count: a.supporting_source_count as number,
            created_at: a.created_at as string,
            citations: citationsArr.map((c: Record<string, unknown>): RagCitation => {
              const article = c.article as Record<string, unknown> | null;
              const source = article?.source as Record<string, unknown> | null;
              return {
                id: c.id as string,
                article_id: c.article_id as string,
                relevance_score: c.relevance_score as number,
                excerpt: c.excerpt as string,
                position: c.position as number,
                title: (article?.title as string) ?? "",
                source_name: (source?.name as string) ?? "",
                source_slug: (source?.slug as string) ?? "",
                published_at: (article?.published_at as string) ?? "",
                url: (article?.url as string) ?? "",
              };
            }),
          };
        }

        return {
          id: row.id as string,
          user_id: row.user_id as string,
          query_text: row.query_text as string,
          is_saved: row.is_saved as boolean,
          created_at: row.created_at as string,
          analysis,
        };
      });

      return mapped;
    },
  });
}

// ── Saved queries ─────────────────────────────────────────────────────────

/** Fetch queries where is_saved=true for the current user (independent of recent window). */
export function useSavedQueries() {
  const user = useAuthStore((s) => s.user);

  return useQuery({
    queryKey: ["savedQueries", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("queries")
        .select("id, query_text, is_saved, created_at")
        .eq("user_id", user.id)
        .eq("is_saved", true)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as { id: string; query_text: string; is_saved: boolean; created_at: string }[];
    },
    enabled: !!user,
  });
}

