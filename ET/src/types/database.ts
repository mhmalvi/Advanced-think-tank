export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "analyst" | "editor" | "admin";
          onboarding_completed: boolean;
          theme_preference: "light" | "dark" | "system";
          display_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["profiles"]["Row"], "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [];
      };
      sources: {
        Row: {
          id: string;
          name: string;
          slug: string;
          url: string;
          feed_url: string | null;
          source_type: "rss" | "api" | "scrape";
          is_active: boolean;
          article_count: number;
          region: string | null;
          language: string;
          fetch_interval_minutes: number;
          last_fetched_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["sources"]["Row"], "id" | "article_count" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["sources"]["Insert"]>;
        Relationships: [];
      };
      articles: {
        Row: {
          id: string;
          source_id: string;
          title: string;
          url: string;
          content: string;
          excerpt: string | null;
          published_at: string;
          ingested_at: string;
          embedding_id: string | null;
          author: string | null;
          language: string;
          region: string | null;
          topic_tags: string[];
          is_processed: boolean;
          source_name: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["articles"]["Row"], "id" | "ingested_at">;
        Update: Partial<Database["public"]["Tables"]["articles"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "articles_source_id_fkey";
            columns: ["source_id"];
            isOneToOne: false;
            referencedRelation: "sources";
            referencedColumns: ["id"];
          },
        ];
      };
      queries: {
        Row: {
          id: string;
          user_id: string;
          query_text: string;
          is_saved: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["queries"]["Row"], "created_at"> & { id?: string };
        Update: Partial<Database["public"]["Tables"]["queries"]["Insert"]>;
        Relationships: [];
      };
      analyses: {
        Row: {
          id: string;
          query_id: string;
          content: string;
          confidence: number;
          primary_source_count: number;
          supporting_source_count: number;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["analyses"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["analyses"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "analyses_query_id_fkey";
            columns: ["query_id"];
            isOneToOne: false;
            referencedRelation: "queries";
            referencedColumns: ["id"];
          },
        ];
      };
      citations: {
        Row: {
          id: string;
          analysis_id: string;
          article_id: string;
          relevance_score: number;
          excerpt: string;
          position: number;
        };
        Insert: Omit<Database["public"]["Tables"]["citations"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["citations"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "citations_analysis_id_fkey";
            columns: ["analysis_id"];
            isOneToOne: false;
            referencedRelation: "analyses";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "citations_article_id_fkey";
            columns: ["article_id"];
            isOneToOne: false;
            referencedRelation: "articles";
            referencedColumns: ["id"];
          },
        ];
      };
      stories: {
        Row: {
          id: string;
          title: string;
          synopsis: string | null;
          synthetic_content: string | null;
          source_count: number;
          source_article_ids: string[];
          labels: StoryLabel[];
          cluster_topic: string | null;
          region: string | null;
          is_featured: boolean;
          content_hash: string | null;
          timeline_entries: TimelineEntry[];
          confidence_score: number;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["stories"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["stories"]["Insert"]>;
        Relationships: [];
      };
      user_preferences: {
        Row: {
          id: string;
          user_id: string;
          preference_type: "industry" | "geography" | "lens";
          preference_value: string;
          source: "onboarding" | "ai_inferred" | "manual";
          is_active: boolean;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_preferences"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["user_preferences"]["Insert"]>;
        Relationships: [];
      };
      user_interactions: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          interaction_type: "like" | "dislike" | "bookmark" | "dismiss";
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["user_interactions"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["user_interactions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_interactions_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      ai_user_profiles: {
        Row: {
          id: string;
          user_id: string;
          profile_summary: AiProfileSummary;
          preference_overrides: string[];
          last_generated_at: string;
          version: number;
        };
        Insert: Omit<Database["public"]["Tables"]["ai_user_profiles"]["Row"], "id" | "last_generated_at">;
        Update: Partial<Database["public"]["Tables"]["ai_user_profiles"]["Insert"]>;
        Relationships: [];
      };
      canvas_sessions: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          messages: ChatMessage[];
          story_versions: StoryVersion[];
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["canvas_sessions"]["Row"], "id" | "created_at" | "updated_at">;
        Update: Partial<Database["public"]["Tables"]["canvas_sessions"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "canvas_sessions_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      user_story_reads: {
        Row: {
          id: string;
          user_id: string;
          story_id: string;
          last_read_at: string;
          content_hash_at_read: string | null;
        };
        Insert: Omit<Database["public"]["Tables"]["user_story_reads"]["Row"], "id">;
        Update: Partial<Database["public"]["Tables"]["user_story_reads"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "user_story_reads_story_id_fkey";
            columns: ["story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      story_cache: {
        Row: {
          story_hash: string;
          synthetic_content: string;
          generated_at: string;
          expires_at: string;
          hit_count: number;
        };
        Insert: Database["public"]["Tables"]["story_cache"]["Row"];
        Update: Partial<Database["public"]["Tables"]["story_cache"]["Insert"]>;
        Relationships: [];
      };
      search_history: {
        Row: {
          id: string;
          user_id: string;
          query: string;
          result_story_id: string | null;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["search_history"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["search_history"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "search_history_result_story_id_fkey";
            columns: ["result_story_id"];
            isOneToOne: false;
            referencedRelation: "stories";
            referencedColumns: ["id"];
          },
        ];
      };
      analyst_waitlist: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
        };
        Insert: Omit<Database["public"]["Tables"]["analyst_waitlist"]["Row"], "id" | "created_at">;
        Update: Partial<Database["public"]["Tables"]["analyst_waitlist"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// ─── V2 Convenience types (kept for backward compatibility) ───

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Source = Database["public"]["Tables"]["sources"]["Row"];
export type Article = Database["public"]["Tables"]["articles"]["Row"];
export type Query = Database["public"]["Tables"]["queries"]["Row"];
export type Analysis = Database["public"]["Tables"]["analyses"]["Row"];
export type Citation = Database["public"]["Tables"]["citations"]["Row"];

// V2 joined types (still used by legacy dashboard)
export type CitationWithArticle = Citation & {
  article: Article & { source: Source };
};

export type AnalysisWithCitations = Analysis & {
  citations: CitationWithArticle[];
};

export type QueryWithAnalysis = Query & {
  analysis: AnalysisWithCitations | null;
};

// RAG pipeline response types (from n8n webhook — used by V2 query flow)
export type RagCitation = {
  id: string;
  article_id: string;
  relevance_score: number;
  excerpt: string;
  position: number;
  title: string;
  source_name: string;
  source_slug: string;
  published_at: string;
  url: string;
};

export type RagAnalysis = {
  id: string;
  query_id: string;
  content: string;
  confidence: number;
  primary_source_count: number;
  supporting_source_count: number;
  created_at: string;
  citations: RagCitation[];
};

export type WebResult = {
  title: string;
  url: string;
  content: string;
  source: string;
  score: number;
  published_date: string;
};

export type RagQueryResult = {
  id: string;
  user_id: string;
  query_text: string;
  is_saved: boolean;
  created_at: string;
  analysis: RagAnalysis | null;
  webResults?: WebResult[];
};

// ─── V3 Types ───

export type StoryLabel = {
  type: "source" | "ai" | "editorial" | "personal";
  text: string;
  reason: string;
};

export type TimelineEntry = {
  timestamp: string;
  summary: string;
  anchor_id: string;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type StoryVersion = {
  content: string;
  timestamp: string;
  version: number;
};

export type AiProfileSummary = {
  inferred_interests: string[];
  avoided_topics: string[];
  preferred_depth: "deep_analysis" | "quick_scan" | "balanced";
  geographic_focus: string[];
  industry_focus: string[];
  lens_preferences: string[];
};

// V3 table convenience types
export type Story = Database["public"]["Tables"]["stories"]["Row"];
export type UserPreference = Database["public"]["Tables"]["user_preferences"]["Row"];
export type UserInteraction = Database["public"]["Tables"]["user_interactions"]["Row"];
export type AiUserProfile = Database["public"]["Tables"]["ai_user_profiles"]["Row"];
export type CanvasSession = Database["public"]["Tables"]["canvas_sessions"]["Row"];
export type UserStoryRead = Database["public"]["Tables"]["user_story_reads"]["Row"];
export type StoryCache = Database["public"]["Tables"]["story_cache"]["Row"];
export type SearchHistory = Database["public"]["Tables"]["search_history"]["Row"];
export type AnalystWaitlist = Database["public"]["Tables"]["analyst_waitlist"]["Row"];

// V3 joined types
export type StoryWithSources = Story & {
  source_articles?: Article[];
};

export type CanvasSessionWithStory = CanvasSession & {
  story: Story;
};
