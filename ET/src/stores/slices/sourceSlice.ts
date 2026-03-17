import type { StateCreator } from "zustand";
import type { Source } from "@/types/database";
import { supabase } from "@/lib/supabase";
import type { AppState } from "@/stores/app";
import { FETCH_RECENT_ARTICLES_LIMIT, FETCH_SOURCE_ARTICLES_LIMIT } from "@/lib/constants";

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

export type SourceSlice = {
  // Sources
  sources: Source[];
  sourcesLoading: boolean;
  fetchSources: () => Promise<void>;

  // Recent articles (for trending/sidebar)
  recentArticles: RecentArticle[];
  fetchRecentArticles: () => Promise<void>;

  // Source browsing
  selectedSource: Source | null;
  sourceArticles: RecentArticle[];
  sourceArticlesLoading: boolean;
  browseSource: (source: Source) => Promise<void>;
  clearSelectedSource: () => void;
  showAllSources: boolean;
  toggleShowAllSources: () => void;

  // Monitoring
  lastIngestionTime: string | null;
  totalArticleCount: number;
  fetchSystemHealth: () => Promise<void>;
};

export const createSourceSlice: StateCreator<AppState, [], [], SourceSlice> = (set) => ({
  sources: [],
  sourcesLoading: false,

  /** Fetches all active sources from Supabase with live article counts from the articles join. */
  fetchSources: async () => {
    set({ sourcesLoading: true });
    try {
      const { data, error } = await supabase
        .from("sources")
        .select("*, articles(count)")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      // Replace static article_count with live count from articles join
      const sources = (data ?? []).map((row: Record<string, unknown>) => {
        const articlesArr = row.articles as { count: number }[] | undefined;
        const liveCount = articlesArr?.[0]?.count ?? 0;
        return { ...row, article_count: liveCount } as Source;
      });
      set({ sources, sourcesLoading: false });
    } catch {
      set({ sources: [], sourcesLoading: false });
    }
  },

  recentArticles: [],

  fetchRecentArticles: async () => {
    try {
      const { data } = await supabase
        .from("articles")
        .select("id, title, published_at, url, excerpt, image_url, source:sources(name)")
        .order("published_at", { ascending: false })
        .limit(FETCH_RECENT_ARTICLES_LIMIT);
      set({ recentArticles: (data ?? []).map((a: Record<string, unknown>) => mapArticleRow(a)) });
    } catch {
      set({ recentArticles: [] });
    }
  },

  selectedSource: null,
  sourceArticles: [],
  sourceArticlesLoading: false,

  /** Selects a source for browsing and loads its most recent articles, clearing any active query. */
  browseSource: async (source: Source) => {
    set({ selectedSource: source, sourceArticlesLoading: true, currentQuery: null, queryError: null });
    try {
      const { data } = await supabase
        .from("articles")
        .select("id, title, published_at, url, excerpt, image_url, source:sources(name)")
        .eq("source_id", source.id)
        .order("published_at", { ascending: false })
        .limit(FETCH_SOURCE_ARTICLES_LIMIT);
      set({
        sourceArticles: (data ?? []).map((a: Record<string, unknown>) => mapArticleRow(a)),
        sourceArticlesLoading: false,
      });
    } catch {
      set({ sourceArticles: [], sourceArticlesLoading: false });
    }
  },

  clearSelectedSource: () => {
    set({ selectedSource: null, sourceArticles: [], queryError: null });
  },

  showAllSources: false,

  toggleShowAllSources: () => {
    set((state) => ({ showAllSources: !state.showAllSources }));
  },

  // Monitoring
  lastIngestionTime: null,
  totalArticleCount: 0,

  /** Fetches the latest ingestion timestamp and total article count for the system health dashboard. */
  fetchSystemHealth: async () => {
    try {
      const { data } = await supabase
        .from("articles")
        .select("ingested_at")
        .order("ingested_at", { ascending: false })
        .limit(1);
      const latest = data?.[0]?.ingested_at ?? null;

      const { count } = await supabase.from("articles").select("*", { count: "exact", head: true });

      set({ lastIngestionTime: latest, totalArticleCount: count ?? 0 });
    } catch {
      // Non-critical
    }
  },
});
