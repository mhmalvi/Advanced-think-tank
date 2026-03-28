# OASIS + MiroFish Comprehensive Integration Plan

## Advanced Think Tank — Simulation Intelligence Layer

---

## Vision

Simulation intelligence doesn't live on one page — it **permeates the whole experience** as an ambient intelligence layer. Like how Google Maps has traffic data baked into every view, not on a separate "traffic tab." Every surface in the app becomes simulation-aware.

---

## Architecture Decisions

- **LLM Provider:** Anthropic Claude Haiku 4.5 (`claude-haiku-4-5`) — ~$0.03/run, already in stack
- **Vector Search:** Pinecone (existing `advanced-think-tank` index) — no new service
- **Graph Storage:** Supabase PostgreSQL (`entities` + `entity_relationships` tables) — replaces Zep Cloud, uses recursive CTEs for graph traversal
- **Simulation Engine:** OASIS (CAMEL-AI) — 50 agents default, max 200
- **Graph Visualization:** `react-force-graph-2d` — one new frontend dependency

**Why no Zep Cloud:** Pinecone + Supabase already handle vector search and structured data. PostgreSQL recursive CTEs handle graph traversal at this scale (hundreds of entities). Adding Zep would mean another external service, another API key, another point of failure — for no meaningful benefit.

---

## Part A: Backend — Python OASIS Service

### New directory: `ET/oasis-service/`

```
oasis-service/
  Dockerfile                  # Python 3.11-slim, uvicorn
  requirements.txt            # fastapi, camel-oasis, httpx, pydantic-settings
  app/
    __init__.py
    main.py                   # FastAPI app
    config.py                 # Env vars: Anthropic key, model, max agents/steps
    models.py                 # Pydantic schemas
    simulation.py             # OASIS wrapper: build agents → seed stories → run → extract
    agent_profiles.py         # 6 archetypes: Analyst, Investor, Journalist, Policy, Academic, Public
    results.py                # Parse OASIS SQLite → engagement, sentiment, virality, polarization
    graph_builder.py          # Entity extraction + graph construction → Supabase tables
    report_agent.py           # Automated report generation from sim data
```

### Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `POST` | `/simulate` | Trigger OASIS simulation with stories (async, returns run_id) |
| `GET` | `/results/{run_id}` | Poll for simulation results |
| `POST` | `/graph/build` | Build knowledge graph from article cluster → Supabase |
| `GET` | `/graph/{project_id}` | Get graph nodes + edges for visualization |
| `GET` | `/graph/{project_id}/entities` | Get entities with filtering |
| `POST` | `/predict` | Run "what-if" scenario prediction |
| `POST` | `/report/generate` | Generate analysis report from sim data |
| `GET` | `/report/{report_id}` | Retrieve generated report |
| `GET` | `/health` | Service health check |

### Key Decisions
- **50 agents default, max 200** — fits 1.5GB memory limit
- **Claude Haiku 4.5** via Anthropic API — ~$0.03/run, ~$5/month at 6 runs/day
- **Supabase PostgreSQL** for knowledge graph persistence (entities + relationships tables)
- **Pinecone** for vector similarity (existing index, `articles` namespace)
- **Reddit-style platform** with random RecSys (cheapest, upgrade later)
- **3 simulation steps** per run — enough for engagement signal, low cost
- **Background task** — POST /simulate returns immediately, n8n polls /results

### Docker Compose Addition

```yaml
  oasis:
    build:
      context: ./ET/oasis-service
      dockerfile: Dockerfile
    container_name: oasis
    networks:
      - apps_web
    environment:
      - OASIS_LLM_API_KEY=${ANTHROPIC_API_KEY}
      - OASIS_LLM_MODEL=claude-haiku-4-5-20251001
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - OASIS_MAX_AGENTS=50
      - OASIS_MAX_STEPS=3
    volumes:
      - oasis_data:/app/data
    restart: unless-stopped
    deploy:
      resources:
        limits:
          memory: 1536M
          cpus: "1.5"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://127.0.0.1:8100/health"]
      interval: 30s
      timeout: 5s
      retries: 3
```

### n8n Workflow

**New file:** `ET/n8n/workflows/oasis-simulation-pipeline.json`

Schedule: every 4h (15min offset from story synthesis)
1. Fetch recent stories from Supabase (last 6h, limit 20)
2. POST to `http://oasis:8100/simulate`
3. Poll /results/{run_id} every 15s, max 10 attempts
4. Write to Supabase `simulation_runs` + `simulation_metrics`
5. PATCH stories with `sim_engagement_rate`, `sim_predicted_virality`, `sim_polarization_flag`

---

## Part B: Database

### New Supabase Tables (migration 009)

**`simulation_runs`** — one row per OASIS execution
```sql
CREATE TABLE public.simulation_runs (
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
```

**`simulation_metrics`** — per-story results
```sql
CREATE TABLE public.simulation_metrics (
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

CREATE INDEX idx_sim_metrics_story ON public.simulation_metrics(story_id);
CREATE INDEX idx_sim_metrics_run ON public.simulation_metrics(run_id);
```

**`entities`** — knowledge graph nodes (replaces Zep Cloud)
```sql
CREATE TABLE public.entities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  entity_type text NOT NULL CHECK (entity_type IN ('person','organization','country','commodity','event','policy','technology')),
  description text,
  mention_count integer DEFAULT 1,
  first_seen_at timestamptz DEFAULT now(),
  last_seen_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(name, entity_type)
);

CREATE INDEX idx_entities_type ON public.entities(entity_type);
CREATE INDEX idx_entities_mentions ON public.entities(mention_count DESC);
```

**`entity_relationships`** — knowledge graph edges
```sql
CREATE TABLE public.entity_relationships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  target_entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  relationship_type text NOT NULL,
  weight numeric(5,4) DEFAULT 1.0,
  article_count integer DEFAULT 1,
  last_seen_at timestamptz DEFAULT now(),
  metadata jsonb DEFAULT '{}',
  UNIQUE(source_entity_id, target_entity_id, relationship_type)
);

CREATE INDEX idx_entity_rels_source ON public.entity_relationships(source_entity_id);
CREATE INDEX idx_entity_rels_target ON public.entity_relationships(target_entity_id);
```

**`entity_article_mentions`** — links entities to articles
```sql
CREATE TABLE public.entity_article_mentions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id uuid NOT NULL REFERENCES public.entities(id) ON DELETE CASCADE,
  article_id uuid NOT NULL REFERENCES public.articles(id) ON DELETE CASCADE,
  story_id uuid REFERENCES public.stories(id) ON DELETE SET NULL,
  context_snippet text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(entity_id, article_id)
);

CREATE INDEX idx_entity_mentions_article ON public.entity_article_mentions(article_id);
CREATE INDEX idx_entity_mentions_story ON public.entity_article_mentions(story_id);
```

**Stories table additions:**
```sql
ALTER TABLE public.stories
  ADD COLUMN IF NOT EXISTS sim_engagement_rate numeric(5,4),
  ADD COLUMN IF NOT EXISTS sim_predicted_virality numeric(5,4),
  ADD COLUMN IF NOT EXISTS sim_polarization_flag boolean DEFAULT false;
```

**Graph traversal query example (replaces Zep Cloud API):**
```sql
-- Get 2-hop entity neighborhood
WITH RECURSIVE graph AS (
  SELECT source_entity_id, target_entity_id, relationship_type, weight, 1 as depth
  FROM entity_relationships
  WHERE source_entity_id = :entity_id
  UNION ALL
  SELECT er.source_entity_id, er.target_entity_id, er.relationship_type, er.weight, g.depth + 1
  FROM entity_relationships er
  JOIN graph g ON er.source_entity_id = g.target_entity_id
  WHERE g.depth < 2
)
SELECT DISTINCT e.*, g.relationship_type, g.weight, g.depth
FROM graph g
JOIN entities e ON e.id = g.target_entity_id;
```

---

## Part C: Frontend — Simulation Intelligence Across Every Surface

### C1. LeftNav — Simulation Section

**Where:** Below Trending stories in the left navigation sidebar.

```
├─────────────────────────┤
│ TRENDING                 │
│   Story title...         │
│   Story title...         │
├─────────────────────────┤
│ SIMULATION               │
│ ┌─────────────────────┐ │
│ │ Status: Active       │ │
│ │ 50 agents · 2h ago  │ │
│ │ Polarization: 0.34  │ │
│ └─────────────────────┘ │
│                          │
│ Top Predicted Impact:    │
│ EU Sanctions...  72%     │
│ TSMC Controls... 68%     │
│ Nordic Energy... 41%     │
│ China Trade... 22%       │
├─────────────────────────┤
│ Simulation Dashboard     │
└─────────────────────────┘
```

**Collapsed view:** Single `FlaskConical` icon with purple pulse dot if recent run.

**New component:** `SimulationSection.tsx`

---

### C2. TopBar — Simulation Status Dot

**Where:** Next to the brand name, before theme/locale/user controls.

A 6px green/amber/red dot with "SIM" label.
- Green: last run < 4h ago, polarization < 0.5
- Amber: last run < 8h ago, or polarization 0.5-0.75
- Red: last run > 8h ago, or echo chamber detected
- **Hover tooltip:** "Last simulation: 2h ago · 50 agents · 847 actions"
- **Click:** navigates to `/simulation`

**New component:** `SimStatusDot.tsx`

---

### C3. SearchBar — Predictive Intelligence Hints

**Where:** Inside the existing SearchBar dropdown, above "Recent" searches, when focused.

Top 3 stories by simulation score. Click navigates to `/canvas/{storyId}`.
Appears only when simulation data exists and search field is empty + focused.

**New component:** `SimulationHints.tsx`

---

### C4. CanvasPage — Story Intelligence Bar

**Where:** Top of the story content panel (right side), above the story headline. Collapsible.

- Horizontal bar chart showing engagement by agent archetype (Recharts)
- **[Entity Map]** — expands inline to show mini knowledge graph (force-graph, 200px height)
- **[What If...]** — expands inline text input, response streams in-place
- **Collapsed state:** single line `72% engagement · 3 entities · 50 agents`
- Shows "No simulation data" gracefully when no metrics exist

**New component:** `StoryIntelligenceBar.tsx`

---

### C5. CanvasPage Chat — Simulation-Aware Suggested Prompts

**Where:** The existing `suggestedPrompts` array in ChatPanel.

- **Simulate Reception** → "How would different analyst personas react to this story?"
- **Entity Map** → "Show me the key entities and relationships in this story"
- **What If...** → "What if the main event in this story escalates further?"

These are just additional pre-filled chat prompt strings.

---

### C6. SourcesPage — Simulation Score Column

**Where:** Extra column in the articles table, after "Region."

Colored dot + score. Derived from matching article's story → simulation_metrics.

**New component:** `SimScoreCell.tsx`

---

### C7. RightSidebar — Simulation Pulse

**Where:** Below the existing "Quick Stats" section (bottom).

Shows a 7-point sparkline of engagement rates from the last 7 simulation runs.

**New component:** `SimulationPulse.tsx`

---

### C8. LandingPage — Predictive Intelligence Feature Card

**Where:** In the existing features grid, as one additional card.

Optionally shows a live counter: "847 simulated interactions today."

**New component:** `SimulationFeatureCard.tsx`

---

### C9. `/simulation` Page — The Graph-First Canvas

**The knowledge graph IS the interface. No tabs.**

**Interaction patterns:**

1. **Browse** — Just look at the graph. Node sizes = mention count. Colors = topic cluster. Metric strip = ambient health. Zero clicks needed.

2. **Investigate** — Click a node. Context panel slides up from bottom. Shows engagement data, propagation breakdown by archetype, related articles.

3. **Predict** — Type a what-if in the context panel. Response streams in-place. Affected nodes pulse on the graph. Radar chart shows multi-axis impact.

4. **Navigate** — Story cluster dots at bottom. Hover = tooltip preview. Click = graph re-centers on that cluster's entities.

---

## Part D: All New Components

| Component | Renders In | Dependencies |
|-----------|-----------|-------------|
| **LeftNav area** | | |
| `SimulationSection.tsx` | LeftNav (below trending) | Zustand store |
| **TopBar area** | | |
| `SimStatusDot.tsx` | TopBar (next to brand) | Zustand store |
| **SearchBar area** | | |
| `SimulationHints.tsx` | SearchBar dropdown (above recent) | Zustand store |
| **CanvasPage area** | | |
| `StoryIntelligenceBar.tsx` | CanvasPage (top of story panel) | Recharts, Zustand |
| **SourcesPage area** | | |
| `SimScoreCell.tsx` | SourcesPage table (extra column) | Zustand store |
| **RightSidebar area** | | |
| `SimulationPulse.tsx` | RightSidebar (bottom section) | Recharts (Sparkline) |
| **LandingPage area** | | |
| `SimulationFeatureCard.tsx` | LandingPage features grid | — |
| **`/simulation` page** | | |
| `SimulationCanvas.tsx` | Full page layout | All below |
| `EntityGraph.tsx` | SimulationCanvas + StoryIntelligenceBar | `react-force-graph-2d` |
| `MetricStrip.tsx` | SimulationCanvas top bar | Recharts |
| `ContextPanel.tsx` | SimulationCanvas slide-up panel | — |
| `EngagementCard.tsx` | ContextPanel | Recharts |
| `PropagationCard.tsx` | ContextPanel | Recharts |
| `WhatIfCard.tsx` | ContextPanel | — |
| `StoryDotNav.tsx` | SimulationCanvas bottom | — |
| **Shared / Reusable** | | |
| `Sparkline.tsx` | SimulationPulse, MetricStrip, LeftNav | Recharts |
| `PolarizationGauge.tsx` | ContextPanel, StoryIntelligenceBar | Custom SVG |
| `Heatmap.tsx` | SimulationCanvas (optional) | Tailwind CSS grid |
| **Data layer** | | |
| `stores/simulation.ts` | Standalone Zustand store | — |
| `types/simulation.ts` | TypeScript types | — |

---

## Part E: Files Modified (Minimal)

| File | Change | Lines |
|------|--------|-------|
| `ET/src/app/components/LeftNav.tsx` | Import + render `<SimulationSection>` | ~6 lines |
| `ET/src/app/App.tsx` | Add `/simulation` route (lazy import) | ~3 lines |
| `ET/src/lib/i18n/en.ts` | Add simulation i18n keys | ~15 keys |
| `ET/src/lib/i18n/da.ts` | Add simulation i18n keys | ~15 keys |
| `docker-compose.yml` | Add oasis service | ~20 lines |
| `ET/.env.example` | Add ANTHROPIC_API_KEY, PINECONE_API_KEY | ~3 lines |

**Zero changes to:** CommandCenter, IngestionHUD, RightSidebar, InteractionButtons, StoryLabels, SourceCarousel, TopBar layout, SearchBar logic, CanvasPage layout, or any existing store.

---

## Part F: New Frontend Dependency

**One addition only:**

```bash
cd ET && pnpm add react-force-graph-2d
```

Everything else uses existing Recharts 3.8 + Tailwind CSS + custom SVG.

---

## Part G: Visualization Stack

| Visualization | Tool | Status |
|--------------|------|--------|
| Bar charts (engagement by archetype) | Recharts `BarChart` | Already installed |
| Area charts (engagement over time) | Recharts `AreaChart` | Already installed |
| Sparklines (inline trends) | Recharts `LineChart` (no axes) | Already installed |
| Sankey diagram (propagation flow) | Recharts `Sankey` | Already installed |
| Radar chart (multi-axis impact) | Recharts `RadarChart` | Already installed |
| Pie/Donut (archetype distribution) | Recharts `PieChart` | Already installed |
| Knowledge graph (entity network) | `react-force-graph-2d` | **New dep (~200KB)** |
| Heatmap (archetype x topic) | Tailwind CSS grid | No dep needed |
| Polarization gauge | Custom SVG half-arc | No dep needed |
| Animated flow (story spread) | CSS keyframes + Tailwind | No dep needed |

---

## Part H: Resource Budget

| Service | Memory | CPU | Cost/month |
|---------|--------|-----|------------|
| app (nginx) | 512MB | 0.5 | — |
| n8n | 1GB | 1.0 | — |
| oasis-service | 1.5GB | 1.5 | ~$5 (Claude Haiku 4.5) |
| **Total** | 3GB / 8GB | 3 / 4 CPU | ~$5/month |

---

## Part I: Implementation Phases

### Phase 1 (Week 1-2): Backend + Core Infrastructure
- Create `oasis-service/` with FastAPI + OASIS
- Docker Compose integration
- n8n simulation workflow
- Supabase migration 009 (simulation tables + entity graph tables + story columns)
- Frontend: Zustand store + TypeScript types

### Phase 2 (Week 2-3): LeftNav + Ambient Intelligence
- `SimulationSection.tsx` in LeftNav
- `SimStatusDot.tsx` in TopBar
- `SimulationPulse.tsx` in RightSidebar
- `SimulationHints.tsx` in SearchBar
- `Sparkline.tsx` shared component

### Phase 3 (Week 3-4): `/simulation` Graph Canvas
- `SimulationCanvas.tsx` full page
- `EntityGraph.tsx` (install react-force-graph-2d)
- `MetricStrip.tsx` + `ContextPanel.tsx`
- `EngagementCard.tsx` + `PropagationCard.tsx`
- `StoryDotNav.tsx`
- `PolarizationGauge.tsx`

### Phase 4 (Week 4-5): Canvas + Sources Integration
- `StoryIntelligenceBar.tsx` on CanvasPage
- `SimScoreCell.tsx` on SourcesPage
- Canvas chat suggested prompts (3 new strings)
- `WhatIfCard.tsx` with streaming responses
- `SimulationFeatureCard.tsx` on LandingPage

### Phase 5 (Week 5-6): Feedback Loop + Polish
- Confidence score blending (sim results → story scores)
- Synthetic interaction bootstrapping for new users
- Echo chamber detection + visual warnings
- Heatmap component
- Report generation endpoint + UI

---

## Part J: Verification Plan

1. **Backend:** `curl http://localhost:8100/health` → OK. POST /simulate → GET /results returns metrics.
2. **LeftNav:** Simulation section shows live data, stories sorted by sim score, sparklines animate.
3. **TopBar:** Green dot visible, tooltip shows last run info, click navigates to /simulation.
4. **SearchBar:** Focus shows top 3 sim-ranked stories above recent searches.
5. **CanvasPage:** Intelligence bar renders with archetype breakdown, entity map expands inline.
6. **SourcesPage:** Sim Score column shows colored dots for articles with simulation data.
7. **RightSidebar:** Pulse section shows sparkline trend at bottom.
8. **`/simulation`:** Graph renders with entities, click node → context panel slides up, what-if returns prediction.
9. **LandingPage:** Feature card displays in grid with live counter.

---

## References

- **OASIS**: https://github.com/camel-ai/oasis — Social simulation engine (CAMEL-AI)
- **MiroFish**: https://github.com/666ghj/MiroFish — Prediction engine with GraphRAG + D3.js
- **react-force-graph**: https://github.com/vasturiano/react-force-graph — Interactive graph visualization
- **Pinecone**: Existing index `advanced-think-tank` (1024D, cosine, serverless)
- **Supabase**: PostgreSQL with recursive CTEs for graph traversal
