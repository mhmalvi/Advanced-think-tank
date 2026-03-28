-- Migration 010: Agent activity log for simulation runs
-- Stores individual agent reactions for MiroFish-style activity feeds

CREATE TABLE IF NOT EXISTS public.simulation_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id uuid NOT NULL REFERENCES public.simulation_runs(id) ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories(id) ON DELETE CASCADE,
  agent_id text NOT NULL,
  archetype text NOT NULL,
  step integer NOT NULL DEFAULT 0,
  action text NOT NULL CHECK (action IN ('like','dislike','share','comment','ignore')),
  sentiment numeric(4,2) NOT NULL DEFAULT 0.0,
  engagement_depth numeric(4,2) NOT NULL DEFAULT 0.0,
  would_share boolean DEFAULT false,
  comment_text text,
  reasoning text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_sim_actions_run ON public.simulation_actions(run_id);
CREATE INDEX idx_sim_actions_story ON public.simulation_actions(story_id);
CREATE INDEX idx_sim_actions_archetype ON public.simulation_actions(archetype);
