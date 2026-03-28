-- Migration 009: Simulation intelligence + knowledge graph tables
-- Adds Aether simulation tracking, per-story metrics, entity graph, and story sim columns

-- ============================================================
-- Simulation runs — one row per Aether execution
-- ============================================================
CREATE TABLE IF NOT EXISTS public.simulation_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id text UNIQUE NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
  agent_count integer NOT NULL,
  simulation_steps integer NOT NULL,
  story_count integer NOT NULL,
  total_actions integer,
  polarization_index numeric(5,4),
  echo_chamber_score numeric(5,4),
  duration_seconds numeric(8,2),
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);

ALTER TABLE public.simulation_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_runs FORCE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view simulation runs"
  ON public.simulation_runs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on simulation_runs"
  ON public.simulation_runs FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Simulation metrics — per-story results from each run
-- ============================================================
CREATE TABLE IF NOT EXISTS public.simulation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  engagement_rate numeric(5,4) NOT NULL,
  sentiment_ratio numeric(5,4) NOT NULL,
  share_velocity numeric(8,4) NOT NULL,
  predicted_virality numeric(5,4) NOT NULL,
  like_count integer DEFAULT 0,
  dislike_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  propagation_depth integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sim_metrics_story ON public.simulation_metrics(story_id);
CREATE INDEX IF NOT EXISTS idx_sim_metrics_run ON public.simulation_metrics(run_id);

ALTER TABLE public.simulation_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulation_metrics FORCE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view simulation metrics"
  ON public.simulation_metrics FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on simulation_metrics"
  ON public.simulation_metrics FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Entities — knowledge graph nodes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('person','organization','country','commodity','event','policy','technology')),
  description text,
  mention_count integer DEFAULT 1,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_name_type ON public.entities(name, entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_type ON public.entities(entity_type);
CREATE INDEX IF NOT EXISTS idx_entities_mentions ON public.entities(mention_count DESC);

ALTER TABLE public.entities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entities FORCE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entities"
  ON public.entities FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on entities"
  ON public.entities FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Entity relationships — knowledge graph edges
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entity_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  weight numeric(5,4) DEFAULT 1.0,
  article_count integer DEFAULT 1,
  last_seen_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}'
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_rels_unique
  ON public.entity_relationships(source_entity_id, target_entity_id, relationship_type);
CREATE INDEX IF NOT EXISTS idx_entity_rels_source ON public.entity_relationships(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_entity_rels_target ON public.entity_relationships(target_entity_id);

ALTER TABLE public.entity_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_relationships FORCE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entity relationships"
  ON public.entity_relationships FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on entity_relationships"
  ON public.entity_relationships FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Entity-article mentions — links entities to source articles
-- ============================================================
CREATE TABLE IF NOT EXISTS public.entity_article_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  context_snippet text,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_entity_mentions_unique
  ON public.entity_article_mentions(entity_id, article_id);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_article ON public.entity_article_mentions(article_id);
CREATE INDEX IF NOT EXISTS idx_entity_mentions_story ON public.entity_article_mentions(story_id);

ALTER TABLE public.entity_article_mentions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entity_article_mentions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view entity mentions"
  ON public.entity_article_mentions FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Service role full access on entity_article_mentions"
  ON public.entity_article_mentions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ============================================================
-- Stories table additions — simulation result columns
-- ============================================================
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS sim_engagement_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS sim_predicted_virality numeric(5,4),
  ADD COLUMN IF NOT EXISTS sim_polarization_flag boolean DEFAULT false;
