# Infrastructure Migration Plan

**Project:** Advanced Think Tank (ATT)
**Date:** 2026-03-28
**Status:** Both Supabase and Pinecone are completely empty — no schema, no data.

---

## Current State

| Service | Status | Details |
|---------|--------|---------|
| **Supabase** | No schema, no tables | Project `qwknvxpzmkkmeeziumok` exists but DB is blank |
| **Pinecone** | Index exists, 0 records | Index `advanced-think-tank` (1024D, cosine, serverless us-east-1) — empty |
| **n8n** | Running on Hetzner VPS | Instance at `n8n.muhammadhmalvi.com` — no workflows imported yet |
| **Supabase MCP** | Not connected | `SUPABASE_ACCESS_TOKEN` just configured — restart Claude Code to activate |

---

## Phase 1: Supabase Schema Setup

Run all 8 migrations **in order** via Supabase SQL Editor (Dashboard > SQL Editor) using the **service_role** key.

### Migration Sequence

| # | File | What It Creates |
|---|------|-----------------|
| 1 | `ET/supabase/migrations/001_initial_schema.sql` | Core tables: `profiles`, `sources`, `articles`, `queries`, `analyses`, `citations`. Auth trigger `handle_new_user()`. Basic RLS policies. |
| 2 | `ET/supabase/migrations/002_fix_rls_and_indexes.sql` | Service role write policies, user insert/delete policies, `set_updated_at()` function, indexes on embeddings and queries. |
| 3 | `ET/supabase/migrations/003_rls_hardening.sql` | Hardens profile UPDATE (prevents role escalation), adds GDPR-compliant DELETE policies. |
| 4 | `ET/supabase/migrations/004_enforce_rls.sql` | FORCE RLS on all tables, drops and recreates all policies cleanly. |
| 5 | `ET/supabase/migrations/005_v3_schema.sql` | 9 new tables: `stories`, `user_preferences`, `user_interactions`, `ai_user_profiles`, `canvas_sessions`, `user_story_reads`, `story_cache`, `search_history`, `analyst_waitlist`. Seeds 18 sources (9 international + 9 Nordic) and 6 sample stories. |
| 6 | `ET/supabase/migrations/006_backfill_v3_fields.sql` | Backfills denormalized fields: `source_name`, `region`, `language`, `is_processed`. |
| 7 | `ET/supabase/migrations/007_stories_anon_access.sql` | Allows anonymous read access to `stories` and `articles` (public dashboard). |
| 8 | `ET/supabase/migrations/008_story_images.sql` | Adds `image_url` column to `stories` and `articles` tables. |

### Tables Created (15 total)

**V2 Core (RAG Pipeline):**
- `profiles` — User accounts (extends auth.users)
- `sources` — RSS/API content feeds (18 seeded)
- `articles` — Ingested content with `embedding_id` linking to Pinecone
- `queries` — User search history
- `analyses` — RAG analysis results
- `citations` — Cited articles in analyses

**V3 Story System:**
- `stories` — Synthesized story clusters (6 seeded)
- `user_preferences` — Onboarding selections (industry/geography/lens)
- `user_interactions` — Like/dislike/bookmark/dismiss
- `ai_user_profiles` — AI-inferred interest profiles
- `canvas_sessions` — Chat + story version history
- `user_story_reads` — Change tracking
- `story_cache` — Synthesis result caching
- `search_history` — V3 story search history
- `analyst_waitlist` — Future feature stub

### RLS Summary
- All tables have RLS **enabled and forced**
- User data scoped to `auth.uid()`
- Stories and articles are publicly readable (anon + authenticated)
- Service role has full access (for n8n pipelines)
- Profile updates prevent role escalation

### Verification Checklist
- [ ] All 15 tables exist
- [ ] `handle_new_user()` trigger fires on auth.users insert
- [ ] `set_updated_at` triggers on profiles, stories, canvas_sessions
- [ ] 18 sources seeded in `sources` table
- [ ] 6 sample stories seeded in `stories` table
- [ ] RLS policies active on all tables (check via `SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public'`)

---

## Phase 2: Pinecone Index Reconciliation

### Problem
- **Existing index:** `advanced-think-tank` (host: `advanced-think-tank-fq9hhsz.svc.aped-4627-b74a.pinecone.io`)
- **n8n README says:** `att-articles` (host: `att-articles-8xhwcso.svc.aped-4627-b74a.pinecone.io`)
- **n8n workflows use:** `advanced-think-tank-fq9hhsz.svc.aped-4627-b74a.pinecone.io` (correct, matches existing)

### Resolution
The n8n workflow JSON files already point to the correct host (`advanced-think-tank-fq9hhsz`). Only the README is outdated.

**Action:** Update `ET/n8n/README.md` lines 83-86 to match the actual index:
```
- Name: advanced-think-tank
- Host: advanced-think-tank-fq9hhsz.svc.aped-4627-b74a.pinecone.io
```

### Index Configuration (already correct)
| Setting | Value |
|---------|-------|
| Name | `advanced-think-tank` |
| Dimensions | 1024 |
| Metric | cosine |
| Type | serverless (AWS us-east-1) |
| Embedding Model | `multilingual-e5-large` (Pinecone integrated) |
| Reranking Model | `bge-reranker-v2-m3` |
| Namespace | `articles` |

### Record Schema
Each article upserted to Pinecone has:
```
id:            "{source_slug}-{urlHash}"     (deterministic dedup)
content:       article text (max 2000 chars)  (embedded by Pinecone)
title:         article title
source:        source name
source_slug:   source slug
published_at:  ISO8601 timestamp
url:           article URL
article_id:    UUID (deterministic from URL)
region:        geographic region
topic_tags:    array of classified topics
```

### Verification Checklist
- [ ] Index `advanced-think-tank` is Ready (confirmed)
- [ ] 1024 dimensions, cosine metric (confirmed)
- [ ] n8n README updated to match actual index name/host

---

## Phase 3: n8n Workflow Deployment

### Prerequisites
1. n8n instance running at `https://n8n.muhammadhmalvi.com`
2. Three credentials configured in n8n (Settings > Credentials):

| Credential | Type | Header Name | Value |
|------------|------|-------------|-------|
| Pinecone API Key | HTTP Header Auth | `Api-Key` | `${PINECONE_API_KEY}` |
| Anthropic API Key | HTTP Header Auth | `x-api-key` | Anthropic API key |
| Supabase Service Role Key | HTTP Header Auth | `Authorization` | `Bearer <service-role-jwt>` |

3. Two environment variables in n8n (Settings > Variables):

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://qwknvxpzmkkmeeziumok.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role JWT from Supabase dashboard |

### Workflows to Import (5 total)

| # | Workflow | File | Trigger | Purpose |
|---|----------|------|---------|---------|
| 1 | RSS Ingestion Pipeline | `ET/n8n/workflows/rss-ingestion-pipeline.json` | Every 30 min + webhook POST `/webhook/att-ingest` | Fetches RSS feeds, enriches articles, dual-writes to Pinecone + Supabase |
| 2 | RAG Query Pipeline | `ET/n8n/workflows/rag-query-pipeline.json` | Webhook POST `/webhook/att-query` | Semantic search via Pinecone, Claude synthesis, returns citations |
| 3 | Story Synthesis Pipeline | `ET/n8n/workflows/story-synthesis-pipeline.json` | TBD | Clusters articles into stories, generates synthetic content |
| 4 | Canvas Chat Pipeline | `ET/n8n/workflows/canvas-chat-pipeline.json` | TBD | Handles interactive canvas chat sessions |
| 5 | Web Search Pipeline | `ET/n8n/workflows/web-search-pipeline.json` | TBD | Web search integration |

### Post-Import Steps
For each workflow:
1. Open in n8n editor
2. Update credential IDs in HTTP nodes (Pinecone, Anthropic, Supabase references)
3. Verify Supabase URL matches `qwknvxpzmkkmeeziumok.supabase.co`
4. Verify Pinecone host matches `advanced-think-tank-fq9hhsz.svc.aped-4627-b74a.pinecone.io`
5. Save and activate

### Data Flow After Activation

```
RSS Feeds (18 sources)
    │
    ▼ (every 30 min)
┌─────────────────────────────┐
│  RSS Ingestion Pipeline     │
│  1. Fetch active sources    │
│  2. Parse RSS XML           │
│  3. Clean HTML, classify    │
│  4. Generate deterministic  │
│     IDs (FNV-1a hash)       │
└──────┬──────────┬───────────┘
       │          │
       ▼          ▼
  Pinecone     Supabase
  (vectors)    (metadata)
  namespace:   table:
  articles     articles
       │          │
       └────┬─────┘
            │
            ▼ (on user query)
┌─────────────────────────────┐
│  RAG Query Pipeline         │
│  1. Embed query (e5-large)  │
│  2. Search top_k=5          │
│  3. Rerank to top_n=3       │
│  4. Claude synthesis        │
│  5. Return with citations   │
└─────────────────────────────┘
```

### Verification Checklist
- [ ] All 3 credentials created in n8n
- [ ] 2 environment variables set in n8n
- [ ] RSS Ingestion Pipeline imported and activated
- [ ] RAG Query Pipeline imported and activated
- [ ] Story Synthesis Pipeline imported
- [ ] Canvas Chat Pipeline imported
- [ ] Web Search Pipeline imported
- [ ] Manual trigger of RSS ingestion succeeds (POST `/webhook/att-ingest`)
- [ ] Articles appear in both Pinecone and Supabase after ingestion
- [ ] Test RAG query returns results (POST `/webhook/att-query`)

---

## Phase 4: Frontend Verification

### Environment Variables (already configured in `ET/.env`)
```
VITE_SUPABASE_URL=https://qwknvxpzmkkmeeziumok.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_N8N_WEBHOOK_URL=https://n8n.muhammadhmalvi.com/webhook
VITE_WEBHOOK_SECRET=<webhook-secret>
VITE_APP_URL=https://att.aethonautomation.com
```

### Verification Checklist
- [ ] `pnpm dev` starts without errors
- [ ] Auth flow works (sign up, sign in, profile created)
- [ ] Stories page loads seeded stories
- [ ] Source strip shows 18 sources
- [ ] RAG query returns results via n8n webhook
- [ ] User interactions (like/bookmark) persist
- [ ] Canvas chat sessions save and load

---

## Execution Order

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4
Supabase    Pinecone    n8n          Frontend
schema      README      workflows    testing
(~10 min)   (~2 min)    (~20 min)    (~10 min)
```

**Critical path:** Phase 1 must complete before Phase 3 (n8n reads from Supabase sources table). Phase 2 is independent. Phase 4 requires all prior phases.

---

## Credentials Reference

| Secret | Location | Used By |
|--------|----------|---------|
| Supabase Anon Key | `ET/.env` (`VITE_SUPABASE_ANON_KEY`) | Frontend client |
| Supabase Service Role Key | n8n Variables | n8n workflows (write access) |
| Supabase Access Token | System env `SUPABASE_ACCESS_TOKEN` | Claude Code MCP |
| Pinecone API Key | System env `PINECONE_API_KEY` + n8n credential | Claude Code MCP + n8n |
| Anthropic API Key | n8n credential | RAG synthesis (Claude) |
| n8n API Key | System env `N8N_API_KEY` | Claude Code MCP |
| Webhook Secret | `ET/.env` (`VITE_WEBHOOK_SECRET`) | Frontend → n8n auth |

---

## Known Issues

1. **n8n README outdated** — References index name `att-articles` but actual index is `advanced-think-tank`
2. **Supabase MCP** — Just configured with access token; requires Claude Code restart to activate
3. **Service role key exposed** — Found hardcoded in `rss-ingestion-pipeline.json` (line 46). Should be replaced with n8n variable reference `{{$vars.SUPABASE_SERVICE_ROLE_KEY}}`
4. **No Supabase Edge Functions** — All server logic runs through n8n webhooks
5. **No Supabase Storage** — Image URLs are external (RSS media tags, Unsplash)
