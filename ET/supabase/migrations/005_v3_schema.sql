-- ============================================================================
-- Migration 005: V3 Schema — New tables + extend existing tables
--
-- SAFE: Does not drop or modify existing data. Adds columns and new tables.
-- Run this in the Supabase SQL Editor with the service_role key.
-- ============================================================================

-- ============================================================================
-- PART 1: EXTEND EXISTING TABLES
-- ============================================================================

-- profiles: add onboarding + theme columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS theme_preference text NOT NULL DEFAULT 'system'
    CHECK (theme_preference IN ('light', 'dark', 'system')),
  ADD COLUMN IF NOT EXISTS display_name text;

-- sources: add feed management columns
ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS fetch_interval_minutes integer NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS last_fetched_at timestamptz;

-- articles: add enrichment columns
ALTER TABLE public.articles
  ADD COLUMN IF NOT EXISTS author text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS region text,
  ADD COLUMN IF NOT EXISTS topic_tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_processed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS source_name text;

-- ============================================================================
-- PART 2: BACKFILL EXISTING DATA
-- ============================================================================

-- Denormalize source_name from sources table
UPDATE public.articles a
  SET source_name = s.name
  FROM public.sources s
  WHERE a.source_id = s.id
    AND a.source_name IS NULL;

-- Mark articles with embeddings as processed
UPDATE public.articles
  SET is_processed = true
  WHERE embedding_id IS NOT NULL
    AND is_processed = false;

-- ============================================================================
-- PART 3: NEW V3 TABLES
-- ============================================================================

-- 1. user_preferences — onboarding & manual preference selections
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  preference_type text NOT NULL CHECK (preference_type IN ('industry', 'geography', 'lens')),
  preference_value text NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('onboarding', 'ai_inferred', 'manual')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON public.user_preferences FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own preferences"
  ON public.user_preferences FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON public.user_preferences FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own preferences"
  ON public.user_preferences FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_preferences"
  ON public.user_preferences FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_preferences_user
  ON public.user_preferences(user_id, preference_type);


-- 2. stories — synthesized story clusters (core V3 entity)
CREATE TABLE IF NOT EXISTS public.stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  synopsis text,
  synthetic_content text,
  source_count integer NOT NULL DEFAULT 0,
  source_article_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  labels jsonb NOT NULL DEFAULT '[]'::jsonb,
  cluster_topic text,
  region text,
  is_featured boolean NOT NULL DEFAULT false,
  content_hash text,
  timeline_entries jsonb NOT NULL DEFAULT '[]'::jsonb,
  confidence_score numeric(3,2) NOT NULL DEFAULT 0.00,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stories FORCE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view stories"
  ON public.stories FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Service role full access to stories"
  ON public.stories FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_stories_created ON public.stories(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stories_topic ON public.stories(cluster_topic);
CREATE INDEX IF NOT EXISTS idx_stories_region ON public.stories(region);
CREATE INDEX IF NOT EXISTS idx_stories_featured ON public.stories(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_stories_confidence ON public.stories(confidence_score DESC);

-- Auto-update updated_at on stories
CREATE TRIGGER set_stories_updated_at
  BEFORE UPDATE ON public.stories
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 3. user_interactions — like/dislike/bookmark/dismiss
CREATE TABLE IF NOT EXISTS public.user_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories ON DELETE CASCADE,
  interaction_type text NOT NULL CHECK (interaction_type IN ('like', 'dislike', 'bookmark', 'dismiss')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, story_id, interaction_type)
);

ALTER TABLE public.user_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_interactions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own interactions"
  ON public.user_interactions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interactions"
  ON public.user_interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interactions"
  ON public.user_interactions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interactions"
  ON public.user_interactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_interactions"
  ON public.user_interactions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_user_interactions_user_story
  ON public.user_interactions(user_id, story_id);
CREATE INDEX IF NOT EXISTS idx_user_interactions_user_type
  ON public.user_interactions(user_id, interaction_type, created_at DESC);


-- 4. ai_user_profiles — AI-inferred user interest profiles
CREATE TABLE IF NOT EXISTS public.ai_user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  profile_summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  preference_overrides jsonb NOT NULL DEFAULT '[]'::jsonb,
  last_generated_at timestamptz NOT NULL DEFAULT now(),
  version integer NOT NULL DEFAULT 1
);

ALTER TABLE public.ai_user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_user_profiles FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai profile"
  ON public.ai_user_profiles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to ai_user_profiles"
  ON public.ai_user_profiles FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 5. canvas_sessions — chat + story version history per canvas interaction
CREATE TABLE IF NOT EXISTS public.canvas_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories ON DELETE CASCADE,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  story_versions jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.canvas_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.canvas_sessions FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own canvas sessions"
  ON public.canvas_sessions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own canvas sessions"
  ON public.canvas_sessions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own canvas sessions"
  ON public.canvas_sessions FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own canvas sessions"
  ON public.canvas_sessions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to canvas_sessions"
  ON public.canvas_sessions FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_canvas_sessions_user
  ON public.canvas_sessions(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_canvas_sessions_story
  ON public.canvas_sessions(story_id);

CREATE TRIGGER set_canvas_sessions_updated_at
  BEFORE UPDATE ON public.canvas_sessions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- 6. user_story_reads — change tracking (feature-flagged on frontend)
CREATE TABLE IF NOT EXISTS public.user_story_reads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  story_id uuid NOT NULL REFERENCES public.stories ON DELETE CASCADE,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  content_hash_at_read text,
  UNIQUE (user_id, story_id)
);

ALTER TABLE public.user_story_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_story_reads FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own story reads"
  ON public.user_story_reads FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can upsert own story reads"
  ON public.user_story_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own story reads"
  ON public.user_story_reads FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to user_story_reads"
  ON public.user_story_reads FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 7. story_cache — synthesis caching layer
CREATE TABLE IF NOT EXISTS public.story_cache (
  story_hash text PRIMARY KEY,
  synthetic_content text NOT NULL,
  generated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  hit_count integer NOT NULL DEFAULT 0
);

ALTER TABLE public.story_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.story_cache FORCE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access to story_cache"
  ON public.story_cache FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- 8. search_history — V3 story-based search history
CREATE TABLE IF NOT EXISTS public.search_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  query text NOT NULL,
  result_story_id uuid REFERENCES public.stories ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own search history"
  ON public.search_history FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own search history"
  ON public.search_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own search history"
  ON public.search_history FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Service role full access to search_history"
  ON public.search_history FOR ALL TO service_role
  USING (true) WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_search_history_user
  ON public.search_history(user_id, created_at DESC);


-- 9. analyst_waitlist — future feature stub
CREATE TABLE IF NOT EXISTS public.analyst_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users ON DELETE CASCADE UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analyst_waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analyst_waitlist FORCE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own waitlist entry"
  ON public.analyst_waitlist FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can join waitlist"
  ON public.analyst_waitlist FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service role full access to analyst_waitlist"
  ON public.analyst_waitlist FOR ALL TO service_role
  USING (true) WITH CHECK (true);


-- ============================================================================
-- PART 4: ADD DANISH/NORDIC SOURCE FEEDS
-- ============================================================================

INSERT INTO public.sources (name, slug, url, feed_url, source_type, is_active, region, language)
VALUES
  ('Børsen', 'boersen', 'https://borsen.dk', 'https://borsen.dk/rss', 'rss', true, 'Nordics', 'da'),
  ('Berlingske', 'berlingske', 'https://berlingske.dk', 'https://berlingske.dk/rss', 'rss', true, 'Nordics', 'da'),
  ('DR Nyheder', 'dr-nyheder', 'https://dr.dk/nyheder', 'https://www.dr.dk/nyheder/service/feeds/allenyheder', 'rss', true, 'Nordics', 'da'),
  ('TV2 Nyheder', 'tv2-nyheder', 'https://nyheder.tv2.dk', 'https://nyheder.tv2.dk/rss', 'rss', true, 'Nordics', 'da'),
  ('Politiken', 'politiken', 'https://politiken.dk', 'https://politiken.dk/rss/senestenyt.rss', 'rss', true, 'Nordics', 'da'),
  ('Jyllands-Posten', 'jyllands-posten', 'https://jyllands-posten.dk', 'https://jyllands-posten.dk/rss', 'rss', true, 'Nordics', 'da'),
  ('Finans.dk', 'finans', 'https://finans.dk', 'https://finans.dk/rss', 'rss', true, 'Nordics', 'da'),
  ('NTB', 'ntb', 'https://ntb.no', 'https://www.ntb.no/rss', 'rss', true, 'Nordics', 'no'),
  ('Reuters Nordic', 'reuters-nordic', 'https://reuters.com', 'https://www.reuters.com/rssFeed/nordics', 'rss', true, 'Nordics', 'en')
ON CONFLICT (slug) DO NOTHING;

-- Tag existing international sources with region
UPDATE public.sources SET region = 'Global' WHERE slug IN ('reuters', 'bloomberg', 'wsj') AND region IS NULL;
UPDATE public.sources SET region = 'Asia' WHERE slug IN ('caixin', 'nikkei', 'scmp') AND region IS NULL;
UPDATE public.sources SET region = 'Global' WHERE slug = 'ft' AND region IS NULL;


-- ============================================================================
-- PART 5: SEED STORIES (sample data for development)
-- ============================================================================

INSERT INTO public.stories (id, title, synopsis, synthetic_content, source_count, source_article_ids, labels, cluster_topic, region, is_featured, content_hash, timeline_entries, confidence_score)
VALUES
  (
    'a1b2c3d4-0001-4000-8000-000000000001',
    'EU Announces New Trade Sanctions Against Russia',
    'The European Union has unveiled a comprehensive new sanctions package targeting Russian energy exports and financial institutions. The measures, agreed upon after intense negotiations, represent the strongest economic response yet.',
    '## New Sanctions Package Announced

The European Union announced its latest round of trade sanctions against Russia on Monday, marking a significant escalation in economic pressure.

### Key Measures

**Energy sector restrictions** now extend to refined petroleum products, with a phase-out period of 90 days for existing contracts.

**Financial sanctions** target three additional Russian banks, freezing their EU-held assets estimated at €4.2 billion.

<stat_callout value="€4.2B" label="in frozen Russian bank assets" source="European Commission" />

### Nordic Impact

Danish shipping companies face new compliance requirements for cargo transiting the Baltic Sea.

[BACKGROUND]
The EU has imposed multiple rounds of sanctions since 2022, progressively tightening restrictions on Russian trade and financial flows. Previous packages focused primarily on raw energy imports and technology transfers.
[/BACKGROUND]

<pull_quote source="Reuters" author="Josep Borrell" date="2026-03-18">These measures send an unmistakable signal that Europe stands united in its resolve.</pull_quote>',
    8,
    '[]'::jsonb,
    '[{"type":"ai","text":"Geopolitics","reason":"AI classified based on sanctions and international relations content"},{"type":"ai","text":"Trade","reason":"AI classified based on trade policy and economic measures"},{"type":"editorial","text":"Danish Relevance","reason":"Story mentions impact on Danish shipping companies and Baltic trade routes"},{"type":"source","text":"Reuters","reason":"Original reporting source"},{"type":"source","text":"Berlingske","reason":"Original reporting source"}]'::jsonb,
    'EU Sanctions',
    'EU',
    true,
    'seed_hash_001',
    '[{"timestamp":"2026-03-18T14:00:00Z","summary":"EU foreign ministers agree on new sanctions package","anchor_id":"new-sanctions-package-announced"},{"timestamp":"2026-03-18T10:00:00Z","summary":"Draft proposal circulated among member states","anchor_id":"key-measures"},{"timestamp":"2026-03-17T16:00:00Z","summary":"Nordic foreign ministers push for stronger shipping restrictions","anchor_id":"nordic-impact"}]'::jsonb,
    0.92
  ),
  (
    'a1b2c3d4-0002-4000-8000-000000000002',
    'Danish Wind Energy Sector Reports Record Q1 Growth',
    'Denmark''s wind energy sector posted record first-quarter results, with Vestas and Ørsted leading a 23% year-over-year increase in installed capacity. Analysts point to accelerated EU green transition policies.',
    '## Record Quarter for Danish Wind

Denmark''s wind energy companies reported their strongest first quarter ever, driven by surging demand across European markets.

### By the Numbers

<chart_data type="bar" data=''[{"label":"Q1 2024","value":2.1},{"label":"Q1 2025","value":2.8},{"label":"Q1 2026","value":3.4}]'' title="Installed Capacity (GW)" />

**Vestas** secured orders worth DKK 14.2 billion, a 31% increase from the previous quarter.

**Ørsted** announced three new offshore wind farm projects in the North Sea.

<stat_callout value="23%" label="year-over-year growth in installed capacity" source="Danish Energy Agency" />

### Market Outlook

Analysts at Danske Bank forecast continued acceleration through 2026, citing EU REPowerEU targets and national climate commitments.

<pull_quote source="Børsen" author="Henrik Poulsen" date="2026-03-19">The green transition is no longer a future aspiration — it is the present reality of Danish industry.</pull_quote>',
    5,
    '[]'::jsonb,
    '[{"type":"ai","text":"Energy","reason":"AI classified based on wind energy and renewable sector content"},{"type":"ai","text":"Business","reason":"AI classified based on corporate earnings and market analysis"},{"type":"editorial","text":"Danish Relevance","reason":"Core Danish industry story — Vestas, Ørsted, Danish Energy Agency"},{"type":"source","text":"Børsen","reason":"Original reporting source"},{"type":"source","text":"Financial Times","reason":"Original reporting source"}]'::jsonb,
    'Danish Wind Energy',
    'Nordics',
    false,
    'seed_hash_002',
    '[{"timestamp":"2026-03-19T08:00:00Z","summary":"Danish Energy Agency releases Q1 capacity figures","anchor_id":"record-quarter-for-danish-wind"},{"timestamp":"2026-03-18T12:00:00Z","summary":"Vestas reports order intake surge","anchor_id":"by-the-numbers"},{"timestamp":"2026-03-17T09:00:00Z","summary":"Ørsted announces North Sea expansion","anchor_id":"by-the-numbers"}]'::jsonb,
    0.88
  ),
  (
    'a1b2c3d4-0003-4000-8000-000000000003',
    'US-China Tariff Escalation Threatens Global Supply Chains',
    'New US tariffs on Chinese semiconductors and rare earth minerals have triggered retaliatory measures from Beijing, raising concerns about disruption to global technology supply chains.',
    '## Tariff War Escalates

The United States imposed 45% tariffs on Chinese semiconductor imports on Tuesday, prompting immediate retaliation from Beijing with export restrictions on rare earth minerals critical to Western technology manufacturing.

### Supply Chain Impact

European manufacturers — particularly in the automotive and electronics sectors — face potential component shortages within 60-90 days if restrictions persist.

<stat_callout value="45%" label="new US tariff rate on Chinese semiconductors" source="US Trade Representative" />

### Nordic Exposure

Swedish telecom giant Ericsson and Finnish Nokia both flagged supply chain risks in investor communications. Danish hearing aid manufacturer Demant sources key components from affected Chinese suppliers.

[BACKGROUND]
US-China trade tensions have escalated steadily since 2018, with successive administrations expanding the scope of tariffs and export controls. The semiconductor sector has been a particular flashpoint due to its strategic importance.
[/BACKGROUND]',
    6,
    '[]'::jsonb,
    '[{"type":"ai","text":"Geopolitics","reason":"AI classified based on US-China trade conflict"},{"type":"ai","text":"Technology","reason":"AI classified based on semiconductor and tech supply chain content"},{"type":"ai","text":"Trade","reason":"AI classified based on tariff and trade policy measures"},{"type":"editorial","text":"Danish Relevance","reason":"Story mentions impact on Danish company Demant and Nordic tech firms"},{"type":"source","text":"Reuters","reason":"Original reporting source"},{"type":"source","text":"Bloomberg","reason":"Original reporting source"}]'::jsonb,
    'US-China Trade',
    'Global',
    false,
    'seed_hash_003',
    '[{"timestamp":"2026-03-19T16:00:00Z","summary":"Beijing announces retaliatory rare earth export restrictions","anchor_id":"tariff-war-escalates"},{"timestamp":"2026-03-19T09:00:00Z","summary":"US Trade Representative confirms 45% semiconductor tariff","anchor_id":"tariff-war-escalates"},{"timestamp":"2026-03-18T14:00:00Z","summary":"Ericsson and Nokia flag supply chain risks","anchor_id":"nordic-exposure"}]'::jsonb,
    0.85
  ),
  (
    'a1b2c3d4-0004-4000-8000-000000000004',
    'Nordic Council Summit Addresses Baltic Security',
    'Nordic heads of state convened in Helsinki to discuss enhanced Baltic security cooperation, agreeing on joint naval patrols and intelligence sharing frameworks in response to increased regional tensions.',
    '## Helsinki Summit: Nordic Unity on Baltic Security

The prime ministers of Denmark, Sweden, Finland, Norway, and Iceland met in Helsinki for an emergency session focused on Baltic Sea security.

### Key Agreements

The summit produced a joint declaration committing to:
- **Joint naval patrols** in the Baltic Sea starting April 2026
- **Shared intelligence framework** for maritime threat detection
- **Coordinated response protocols** for critical infrastructure protection

### Danish Commitment

Danish Prime Minister announced deployment of two additional frigates to Baltic patrol duties and increased funding for the Danish Defence Intelligence Service.

<pull_quote source="DR Nyheder" author="Mette Frederiksen" date="2026-03-18">Denmark will not be a bystander while our shared waters face new threats.</pull_quote>',
    4,
    '[]'::jsonb,
    '[{"type":"ai","text":"Geopolitics","reason":"AI classified based on security cooperation and defense policy"},{"type":"ai","text":"Defense","reason":"AI classified based on military and naval content"},{"type":"editorial","text":"Danish Relevance","reason":"Direct Danish government involvement — PM statement, frigate deployment"},{"type":"source","text":"DR Nyheder","reason":"Original reporting source"},{"type":"source","text":"NTB","reason":"Original reporting source"}]'::jsonb,
    'Nordic Security',
    'Nordics',
    false,
    'seed_hash_004',
    '[{"timestamp":"2026-03-18T18:00:00Z","summary":"Joint declaration signed by all five Nordic PMs","anchor_id":"helsinki-summit-nordic-unity-on-baltic-security"},{"timestamp":"2026-03-18T11:00:00Z","summary":"Summit opens with security briefing","anchor_id":"key-agreements"},{"timestamp":"2026-03-17T15:00:00Z","summary":"Danish PM confirms frigate deployment","anchor_id":"danish-commitment"}]'::jsonb,
    0.90
  ),
  (
    'a1b2c3d4-0005-4000-8000-000000000005',
    'ECB Holds Rates Amid Mixed Inflation Signals',
    'The European Central Bank held interest rates unchanged at 3.25%, citing persistent services inflation despite easing energy prices. Markets had priced in a 60% chance of a cut.',
    '## ECB Rate Decision: Hold Steady

The European Central Bank kept its benchmark interest rate at 3.25% on Thursday, defying market expectations of a 25 basis point cut.

### Inflation Breakdown

<chart_data type="line" data=''[{"label":"Oct","value":3.1},{"label":"Nov","value":2.9},{"label":"Dec","value":2.7},{"label":"Jan","value":2.8},{"label":"Feb","value":2.6},{"label":"Mar","value":2.5}]'' title="Eurozone CPI (%)" />

While headline inflation continued its downward trend to 2.5%, **services inflation** remained sticky at 3.8%, well above the ECB''s comfort zone.

<stat_callout value="3.25%" label="ECB benchmark rate — unchanged" source="European Central Bank" />

### Nordic Banking Impact

Danske Bank and Nordea both revised their rate-cut forecasts, now expecting the first cut in June rather than April.',
    7,
    '[]'::jsonb,
    '[{"type":"ai","text":"Economics","reason":"AI classified based on monetary policy and inflation content"},{"type":"ai","text":"Finance","reason":"AI classified based on central bank and banking sector content"},{"type":"editorial","text":"Danish Relevance","reason":"Danske Bank and Nordic banking sector directly affected"},{"type":"source","text":"Financial Times","reason":"Original reporting source"},{"type":"source","text":"Bloomberg","reason":"Original reporting source"},{"type":"source","text":"Berlingske","reason":"Original reporting source"}]'::jsonb,
    'ECB Monetary Policy',
    'EU',
    false,
    'seed_hash_005',
    '[{"timestamp":"2026-03-20T13:45:00Z","summary":"ECB announces rate hold at 3.25%","anchor_id":"ecb-rate-decision-hold-steady"},{"timestamp":"2026-03-20T14:30:00Z","summary":"Lagarde press conference cites services inflation","anchor_id":"inflation-breakdown"},{"timestamp":"2026-03-20T15:00:00Z","summary":"Danske Bank revises rate-cut forecast to June","anchor_id":"nordic-banking-impact"}]'::jsonb,
    0.94
  ),
  (
    'a1b2c3d4-0006-4000-8000-000000000006',
    'Middle East Tensions Disrupt Shipping Through Strait of Hormuz',
    'Renewed military activity near the Strait of Hormuz has forced major shipping companies to reroute vessels, adding 7-10 days to Asia-Europe transit times and driving up freight costs by 35%.',
    '## Hormuz Disruption: Shipping Reroutes Accelerate

Escalating military activity near the Strait of Hormuz has prompted Maersk, MSC, and CMA CGM to divert container vessels via the Cape of Good Hope, significantly extending transit times.

### Cost Impact

<stat_callout value="35%" label="increase in Asia-Europe freight rates" source="Drewry Shipping Consultants" />

The rerouting adds approximately 7-10 days to standard Asia-Europe shipping routes, with fuel costs increasing proportionally.

### Danish Shipping Exposure

**Maersk**, headquartered in Copenhagen, is the most directly affected European carrier. The company has activated contingency pricing across all affected routes.

[BACKGROUND]
The Strait of Hormuz handles approximately 20% of global oil transit and significant container traffic. Previous disruptions in 2024 led to temporary freight rate spikes of up to 200%.
[/BACKGROUND]

<pull_quote source="Finans.dk" author="Vincent Clerc" date="2026-03-19">We are managing the situation with our contingency plans, but customers should expect delays and adjusted pricing.</pull_quote>',
    5,
    '[]'::jsonb,
    '[{"type":"ai","text":"Trade","reason":"AI classified based on shipping and trade route disruption"},{"type":"ai","text":"Geopolitics","reason":"AI classified based on military activity and regional tensions"},{"type":"editorial","text":"Danish Relevance","reason":"Maersk (Copenhagen-based) is the most affected European carrier"},{"type":"source","text":"Finans.dk","reason":"Original reporting source"},{"type":"source","text":"Reuters","reason":"Original reporting source"}]'::jsonb,
    'Hormuz Shipping Disruption',
    'Middle East',
    false,
    'seed_hash_006',
    '[{"timestamp":"2026-03-19T20:00:00Z","summary":"Maersk announces Cape of Good Hope rerouting for all Hormuz-transit vessels","anchor_id":"hormuz-disruption-shipping-reroutes-accelerate"},{"timestamp":"2026-03-19T14:00:00Z","summary":"Drewry reports 35% freight rate spike","anchor_id":"cost-impact"},{"timestamp":"2026-03-19T08:00:00Z","summary":"Military activity reported near Strait","anchor_id":"hormuz-disruption-shipping-reroutes-accelerate"}]'::jsonb,
    0.87
  );
