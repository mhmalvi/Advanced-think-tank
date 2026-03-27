# Advanced Think Tank — Full Infrastructure & Application Audit

**Date:** 2026-03-07
**Server:** Hetzner VPS (46.224.81.90) — 4 vCPUs, 7.6 GB RAM, 150 GB SSD
**Uptime:** 3 days, 20 hours | **Load:** 0.20 (healthy)

---

## 1. Executive Summary

Advanced Think Tank is a **geo-economic intelligence platform** that ingests news from 17 RSS sources, embeds them into Pinecone vector search, and answers analyst queries via a RAG pipeline (Pinecone + Claude synthesis). The frontend is a React SPA served via nginx, with n8n as the backend workflow engine and Supabase for auth/data persistence.

**Overall Assessment:** The core product is functional and well-architected for an early-stage platform. The RAG query pipeline, RSS ingestion, and web search pipelines all work. However, there are **critical security gaps**, **infrastructure fragility**, **missing production hardening**, and **significant gaps in the core offering** that need attention before this is production-ready.

### Risk Matrix

| Area | Status | Severity |
|------|--------|----------|
| TLS/HTTPS | Self-signed certs only | **CRITICAL** |
| Secrets exposure | API keys in docker-compose & .env committed to git | **CRITICAL** |
| n8n encryption key | Exposed in container config file | **HIGH** |
| No firewall configured | Port 3000 directly exposed to internet | **HIGH** |
| No swap memory | OOM risk on 7.6GB system | **MEDIUM** |
| No error handling in n8n workflows | Silent failures | **MEDIUM** |
| Duplicate/stale Docker setup | Two competing compose files | **LOW** |

---

## 2. Infrastructure Audit

### 2.1 Server Resources

| Resource | Current | Assessment |
|----------|---------|------------|
| CPU | 4 cores, load 0.20 | Healthy — plenty of headroom |
| RAM | 7.6 GB total, 1.5 GB used | Good — n8n uses 303 MB, app uses 4.6 MB |
| Disk | 150 GB, 13 GB used (9%) | Plenty of space |
| Swap | **0 bytes** | **Missing** — OOM killer risk under load |

**Action Required:**
- Add swap: `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile`
- Add to `/etc/fstab` for persistence

### 2.2 Docker Setup

**Running containers (repo project):**
- `repo-app-1` — nginx serving React SPA (healthy, 4.6 MB RAM)
- `repo-n8n-1` — n8n v2.10.4 (healthy, 303 MB RAM)

**Stopped containers (old project):**
- `advanced-think-tank-app` — Created but never started
- `advanced-think-tank-n8n` — Created but never started

**Issues Found:**
1. **Two competing docker-compose files:** `/opt/advanced-think-tank/docker-compose.yml` (old, stopped) and `/opt/advanced-think-tank/repo/docker-compose.yml` (active). The old one has `N8N_API_KEY=advanced-think-tank-n8n-api-2026` hardcoded and exposes port 5678 to `0.0.0.0` (world-accessible). **Clean up the old setup.**
2. **Stopped containers waste resources.** Run `docker rm advanced-think-tank-app advanced-think-tank-n8n` and `docker network rm advanced-think-tank-net`.
3. **n8n pinned to v2.10.4** — good practice. The old compose uses `:latest` which is risky.
4. **Memory limits set correctly** — app: 256M, n8n: 1G.
5. **The old Dockerfile at `/opt/advanced-think-tank/app/Dockerfile`** references a path `COPY /opt/advanced-think-tank/app/nginx.conf` which is an absolute host path — this would fail during Docker build. The active Dockerfile in `ET/` is correct.

### 2.3 Networking & Reverse Proxy

**System nginx** (host-level) serves three virtual hosts:
- `et.advanced-think-tank.com` → port 3000 (app) + webhook proxy to n8n
- `n8n.advanced-think-tank.com` → port 5678 (n8n UI + webhooks)
- `46.224.81.90` (default) → same as above with self-signed SSL

**Container nginx** (inside app container) handles SPA routing, CSP headers, gzip, and webhook proxying to `n8n:5678`.

**Issues Found:**
1. **Self-signed certificates only.** No Let's Encrypt / real TLS. Browsers will show security warnings. The `VITE_APP_URL` is set to `http://46.224.81.90` — plain HTTP.
2. **Port 3000 exposed directly to 0.0.0.0** — accessible without going through system nginx. Should be `127.0.0.1:3000:80`.
3. **`/webhook-test/` exposed in production** — this is n8n's test webhook endpoint, should be blocked in production nginx configs.
4. **n8n UI exposed via `/n8n/` path on the IP** and fully at `n8n.advanced-think-tank.com` — no IP whitelist or basic auth. Anyone who knows the domain can access the n8n admin panel.
5. **No firewall (ufw/iptables) configured.** Ports 22, 80, 443, 3000 all open to the world.
6. **Double webhook proxying** — system nginx proxies `/webhook/` to n8n, AND the container nginx also proxies `/webhook/` to n8n. This means webhooks work via two paths, which is fine but creates confusion about which rate limits apply.

### 2.4 TLS / HTTPS — CRITICAL

```
ssl_certificate /etc/nginx/ssl/self-signed.crt;
ssl_certificate_key /etc/nginx/ssl/self-signed.key;
```

**This is not production-ready.** Self-signed certs:
- Trigger browser warnings
- Break `crypto.randomUUID()` (requires secure context) — the code already has a fallback for this
- Prevent Service Workers / PWA
- Reduce user trust

**Fix:** Install certbot and get real certificates:
```bash
apt install certbot python3-certbot-nginx
certbot --nginx -d et.advanced-think-tank.com -d n8n.advanced-think-tank.com
```

### 2.5 CI/CD Pipeline

The GitHub Actions workflow is solid:
1. `check` job: install + typecheck + build
2. `build` job: verify build passes
3. `deploy` job: SSH into VPS → run `/opt/advanced-think-tank/deploy.sh`

**Issues:**
1. **Deploy script uses `git reset --hard origin/main`** — this destroys any local changes on the server. This is fine for a clean deploy but risky if someone makes manual changes on the server.
2. **Lint step uses `|| true`** — lint errors are silently ignored.
3. **No rollback mechanism.** If a deploy breaks the app, there's no quick way to revert.
4. **Deploy script references `/opt/advanced-think-tank/deploy.sh`** (root-level) but the actual script is at `/opt/advanced-think-tank/repo/deploy.sh`. They appear to be the same content but this is confusing.

### 2.6 Backups

Backup script runs daily at 3:00 AM UTC via cron:
- Backs up n8n SQLite database
- Backs up .env and docker-compose.yml
- 14-day retention
- Compressed to tar.gz

**Issues:**
1. **Backups stored only on the same server.** No off-site backup (S3, B2, etc.). If the server dies, backups are lost.
2. **No Supabase data backup.** The Supabase database (articles, queries, analyses, citations) is not backed up locally.
3. **No Pinecone backup strategy.** Vector data exists only in Pinecone.

---

## 3. Application Audit

### 3.1 Frontend Architecture

**Stack:** React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + shadcn/ui + Zustand

**Structure:**
```
ET/src/
├── main.tsx              — Entry point
├── app/App.tsx           — Router + ThemeProvider + ErrorBoundary
├── pages/
│   ├── AuthPage.tsx      — Login/signup form
│   └── DashboardPage.tsx — Main intelligence dashboard
├── app/components/
│   ├── QueryArea.tsx     — Search input with Cmd+K shortcut
│   ├── AnswerArea.tsx    — RAG analysis + citations + web results
│   ├── LeftNav.tsx       — Sidebar with sources, queries, articles
│   ├── RightSidebar.tsx  — Stats, top sources, latest articles
│   ├── SourceStrip.tsx   — Horizontal source pill selector
│   ├── ProtectedRoute.tsx— Auth guard
│   ├── ThemeToggle.tsx   — Dark/light mode
│   ├── LanguageSwitcher  — EN/DA toggle
│   └── ui/               — 48 shadcn/ui primitives
├── stores/
│   ├── app.ts            — Main app state (queries, sources, articles)
│   ├── auth.ts           — Authentication state
│   └── locale.ts         — i18n (English + Danish)
├── lib/
│   ├── api.ts            — n8n webhook API client
│   ├── supabase.ts       — Supabase client (lazy proxy)
│   ├── utils.ts          — cn() helper
│   └── i18n/             — Translation files (en.ts, da.ts)
├── types/database.ts     — Full Supabase schema types
└── styles/               — CSS files
```

**What's Working Well:**
- Clean component architecture with proper separation of concerns
- Zustand state management with caching (5min TTL, max 50 entries)
- Rate limiting on client side (2s between queries)
- URL validation (XSS prevention via `isSafeUrl()`)
- HTML escaping for copy fallback
- Lazy loading for pages (code splitting)
- ErrorBoundary at root level
- Accessible: skip links, ARIA labels, keyboard navigation (Cmd+K)
- i18n support (English + Danish)
- Dark/light theme support
- Export functionality (Markdown, Text, Email)

**Issues Found:**

1. **No mobile responsiveness.** The layout is a fixed 3-column (LeftNav 264px + main + RightSidebar 320px). On mobile/tablet screens, this will overflow. The `LeftNav` and `RightSidebar` are always visible with no hamburger menu or responsive breakpoints.

2. **`console.error` calls in production.** Found in `api.ts:110`, `app.ts:200`, `app.ts:249`, `app.ts:252`, `auth.ts:135`. These should be removed or replaced with a proper error reporting service.

3. **No loading state for initial data.** `DashboardPage` fires 4 parallel fetches on mount (`fetchSources`, `fetchRecentArticles`, `fetchQueryCountToday`, `fetchRecentQueries`) but shows no loading indicator while they complete.

4. **Feedback is stored as `is_saved` boolean** — there's no proper feedback table. Upvote sets `is_saved=true`, downvote sets `is_saved=false`. This conflates "saved query" with "feedback", and you lose the distinction between "not voted" and "downvoted".

5. **No pagination.** Recent queries limited to 20, articles limited to 50. No "load more" or infinite scroll.

6. **48 shadcn/ui components installed but most are unused.** Only `skeleton` and `sonner` appear to be actively used. The rest (accordion, alert-dialog, menubar, etc.) add to bundle size. Consider tree-shaking or removing unused components.

7. **`@types/react` version mismatch.** Package.json has `@types/react: ^19.2.14` but the app uses React 18.3.1. This works but may cause type issues.

8. **Build output is 544 KB total JS** (vendor 146KB + supabase 174KB + dashboard 58KB + router 36KB + index 16KB + ui 12KB + app 7KB + auth 4KB). The Supabase client is the largest chunk — consider whether all of it is needed.

### 3.2 Backend — n8n Workflows

Three active workflows:

#### RAG Query Pipeline (`/webhook/advanced-think-tank-query`)
```
Webhook → Pinecone Search (top_k:5, rerank top_n:3) → Prepare Context → Claude Synthesis → Build Response → Respond
```

**Issues:**
1. **No error handling nodes.** If Pinecone or Claude API fails, the webhook returns nothing and the frontend shows a generic error.
2. **No input validation.** The webhook accepts any POST body — no check on `query_text` length, type, or existence.
3. **Confidence score calculation is wrong.** The code does `avgScore * 100` but `relevance_score` is already `Math.round(score * 100)`. This double-multiplies, potentially producing values > 100 (clamped to 100 by `Math.min`). Most queries will show 100% confidence.
4. **Claude model in workflow JSON is `claude-sonnet-4-20250514`** but ARCHITECTURE.md says "Claude Haiku 4.5". Inconsistency — the actual running workflow may differ from the JSON files in the repo.
5. **No retry logic.** If Claude API returns a 529 (overloaded), the pipeline fails.
6. **System prompt is inline in the JSON body.** Hard to maintain. Consider using n8n's built-in AI nodes or a dedicated prompt template.

#### RSS Ingestion Pipeline (every 2 hours)
```
Schedule/Webhook → Fetch Source IDs → Feed List (17 feeds) → Read RSS → Process Articles → Filter → Upsert to Pinecone + Supabase (parallel)
```

**Issues:**
1. **2-hour interval, not 30 minutes** as stated in ARCHITECTURE.md.
2. **Only 10 articles per feed per cycle** (`slice(0, 10)`). For high-volume feeds (BBC, NYT), many articles may be missed between cycles.
3. **UUID generation from URL hash is deterministic but weak.** The FNV-1a hash produces 32-bit values, and the UUID construction from it (`pad(h1,8)-pad(h2,4)-4pad(h3,3)-8pad(h4,3)-pad(h5,12)`) reuses overlapping bit slices of the same hash, which reduces collision resistance.
4. **No content deduplication.** Same story from different sources gets stored as separate articles. The `Prefer: resolution=merge-duplicates` header on Supabase relies on a unique constraint, but only on `id`, not on content similarity.
5. **`onError: "continueRegularOutput"`** on RSS Read and Supabase upsert — errors are silently swallowed with no logging or alerting.
6. **Bloomberg feeds (`feeds.bloomberg.com`) are often blocked/empty** behind paywall. Same for FT, Nikkei, Caixin. These may produce zero articles silently.
7. **Two Bloomberg entries share the same source_slug** `'bloomberg'` — will map to same source_id.

#### Web Search Pipeline (`/webhook/advanced-think-tank-websearch`)
```
Webhook → Tavily + SerpApi (parallel) → Merge & Deduplicate → Respond
```

**Issues:**
1. **Tavily API key is sent in the request body** (`api_key: $env.TAVILY_API_KEY`). This is Tavily's API design, but the key is visible in n8n execution logs.
2. **No input validation** on the webhook.
3. **Results are not persisted.** Web search results shown to the user are lost after the page session. They're not saved to Supabase or Pinecone.

### 3.3 Database Schema (Supabase)

**Tables:**
- `profiles` — User profiles (id, email, full_name, avatar_url, role, timestamps)
- `sources` — RSS/API sources (id, name, slug, url, feed_url, type, is_active, article_count)
- `articles` — Ingested articles (id, source_id, title, url, content, excerpt, published_at, ingested_at, embedding_id)
- `queries` — User queries (id, user_id, query_text, is_saved, created_at)
- `analyses` — RAG analysis results (id, query_id, content, confidence, source counts, created_at)
- `citations` — Citations linking analyses to articles (id, analysis_id, article_id, relevance_score, excerpt, position)

**Issues:**
1. **No dedicated feedback table.** Feedback is overloaded onto `queries.is_saved`.
2. **`article_count` on `sources` is a denormalized field** — unclear if it's updated by a trigger or manually. Could get out of sync.
3. **Types are manually defined** in `src/types/database.ts` instead of auto-generated from Supabase schema via `supabase gen types typescript`.
4. **No indexes mentioned.** Queries by `user_id`, `created_at`, `source_id` should have indexes for performance.

---

## 4. Security Audit

### 4.1 CRITICAL Issues

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 1 | **Supabase anon key committed to git** in plain text | `/opt/advanced-think-tank/docker-compose.yml` line 29, `.env` files | Move to GitHub Secrets / env vars only. Note: Supabase anon keys are designed to be public when RLS is properly configured, but the service role key must stay secret. |
| 2 | **N8N API key hardcoded** `advanced-think-tank-n8n-api-2026` | `/opt/advanced-think-tank/docker-compose.yml` line 15 | Remove from version control, use secrets |
| 3 | **Self-signed TLS certificates** | `/etc/nginx/ssl/self-signed.*` | Install Let's Encrypt via certbot |
| 4 | **n8n encryption key exposed** `CpuTBrAZqpE9wATnPIE7aabh2teEisFf` | Container `/home/node/.n8n/config` | This key encrypts n8n credentials (Pinecone, Anthropic API keys). If exposed, all stored credentials are compromised. Rotate it. |
| 5 | **No firewall** | Server-level | Enable ufw: `ufw allow 22,80,443/tcp && ufw enable` |
| 6 | **Port 3000 open to internet** | Docker compose `0.0.0.0:3000:80` | Change to `127.0.0.1:3000:80` |

### 4.2 HIGH Issues

| # | Issue | Location | Fix |
|---|-------|----------|-----|
| 7 | **n8n admin UI publicly accessible** | `n8n.advanced-think-tank.com` | Add basic auth or IP whitelist to nginx |
| 8 | **`/webhook-test/` exposed in production** | System nginx configs | Remove from production nginx |
| 9 | **No CSRF protection** on state-changing requests | Frontend → n8n webhooks | Add CSRF tokens or use SameSite cookies |
| 10 | **No rate limiting on system nginx** | `/etc/nginx/sites-enabled/*` | Add `limit_req_zone` (the container nginx has it, but system nginx doesn't) |

### 4.3 What's Done Well

- n8n bound to `127.0.0.1:5678` in Docker (not directly exposed)
- CSP headers configured in container nginx
- Security headers (X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- URL validation for XSS prevention in frontend
- Auth error messages sanitized (no internal detail leakage)
- Supabase RLS mentioned as enabled
- Input length validation on queries (2000 char max)
- Client-side rate limiting (2s interval)

---

## 5. Core Offering Analysis — What's Working vs What's Missing

### 5.1 Core Value Proposition

Advanced Think Tank's core offering is: **"Ask a question about geo-economic affairs, get an AI-synthesized answer with cited sources from 17+ news feeds."**

### 5.2 What's Implemented (Working)

| Feature | Status | Quality |
|---------|--------|---------|
| RSS ingestion from 17 sources | Working | Good — dual-write to Pinecone + Supabase |
| RAG query pipeline | Working | Good — Pinecone search + reranking + Claude synthesis |
| Web search augmentation | Working | Good — Tavily + SerpApi parallel with dedup |
| User authentication | Working | Good — Supabase auth with proper error handling |
| Citation display with relevance | Working | Good — sort, filter, external links |
| Source browsing | Working | Good — browse articles by source |
| Dark/light theme | Working | Good |
| English/Danish i18n | Working | Good |
| Export (Markdown/Text/Email) | Working | Good |
| CI/CD pipeline | Working | Adequate |
| Daily backups | Working | Basic |

### 5.3 What's Missing — Critical Gaps

#### Gap 1: **No Streaming Responses** (High Impact)
The RAG pipeline waits for the full Claude response before showing anything. With a 30s timeout, users stare at a loading skeleton for 5-15 seconds. **Streaming would dramatically improve perceived performance** and is the #1 UX improvement needed.

#### Gap 2: **Not Mobile-Responsive** (High Impact)
The 3-column layout (264px + flex + 320px) is desktop-only. No hamburger menu, no responsive breakpoints, no mobile considerations. At least 30-40% of users will likely access on tablets/phones.

#### Gap 3: **No Alerting / Monitoring** (High Impact)
- No uptime monitoring (the app could go down and nobody would know)
- No n8n workflow failure alerting (RSS ingestion could silently fail for days)
- No query latency tracking
- No Pinecone index health monitoring

#### Gap 4: **No Saved Queries / Alerts** (Medium Impact)
Users can't save queries for re-execution or set up alerts when new articles match their interests. This is a core feature for an intelligence platform — analysts need persistent watchlists.

#### Gap 5: **No Article Deduplication** (Medium Impact)
The same news story from BBC, NYT, and Al Jazeera creates 3 separate articles. This clutters results and wastes Pinecone storage. Content-similarity deduplication would improve quality.

#### Gap 6: **No Query History UI** (Medium Impact)
Recent queries show in the left sidebar but there's no dedicated history page with search, date filtering, or the ability to revisit past analyses.

#### Gap 7: **No Admin Dashboard** (Medium Impact)
No way to:
- Monitor ingestion health (which feeds are working, which are failing)
- See system stats (Pinecone vector count, daily query volume)
- Manage sources (add/remove/edit feeds)
- View user activity

#### Gap 8: **No Proper Feedback System** (Low Impact)
Thumbs up/down is stored as `queries.is_saved` boolean. Need a dedicated `feedback` table with `user_id`, `query_id`, `rating`, `comment`, `created_at` to actually learn from user feedback and improve the pipeline.

---

## 6. Recommendations — Priority Roadmap

### P0 — Security (Do Immediately)

1. **Install Let's Encrypt TLS certificates** via certbot
2. **Enable ufw firewall** — allow only ports 22, 80, 443
3. **Bind port 3000 to localhost** — change `"3000:80"` to `"127.0.0.1:3000:80"` in docker-compose
4. **Remove old docker-compose** and stopped containers at `/opt/advanced-think-tank/docker-compose.yml`
5. **Block `/webhook-test/`** in production nginx configs
6. **Add basic auth or IP whitelist** to n8n admin UI
7. **Add rate limiting** to system nginx webhook locations
8. **Rotate n8n encryption key** and all API keys that may have been exposed
9. **Add swap memory** (2 GB)

### P1 — Core Product (Next 2 Weeks)

1. **Add response streaming** — Use Claude's streaming API through n8n, pipe chunks via SSE to the frontend
2. **Make it mobile-responsive** — Collapsible sidebars, hamburger menu, responsive breakpoints
3. **Add error handling to n8n workflows** — Error trigger nodes, retry logic, Slack/email alerting on failure
4. **Fix confidence score calculation** — Currently double-multiplied
5. **Add input validation** to n8n webhooks (check query_text exists, length, type)
6. **Increase RSS ingestion frequency** to 30min as designed, or increase articles-per-feed from 10 to 20

### P2 — Enhanced Core Offering (Next Month)

1. **Saved queries with alerts** — Let analysts save queries and get notified when new matching articles appear
2. **Article deduplication** — Use embedding similarity to group duplicate articles across sources
3. **Query history page** — Full history with search, date range, re-run capability
4. **Admin dashboard** — Ingestion health, feed status, system metrics, user activity
5. **Proper feedback table** — Replace `is_saved` hack with dedicated feedback tracking
6. **Off-site backups** — Push daily backups to S3/B2

### P3 — Growth Features (Next Quarter)

1. **Auto-generated types** from Supabase schema (`supabase gen types typescript`)
2. **Server-side caching** (Redis) for frequent queries
3. **PDF/email report generation** from analyses
4. **Entity extraction** — Auto-tag articles with countries, organizations, topics
5. **Source quality scoring** — Track which sources are most cited / most reliable
6. **Custom RSS feeds** — Let users add their own sources
7. **Multi-agent analysis** — Specialized agents for trade, energy, security domains

---

## 7. File-Level Issues Summary

| File | Line(s) | Issue |
|------|---------|-------|
| `/opt/advanced-think-tank/docker-compose.yml` | 15,28-29 | API key and Supabase key hardcoded |
| `/opt/advanced-think-tank/repo/docker-compose.yml` | 6 | Port 3000 bound to 0.0.0.0 |
| `/opt/advanced-think-tank/repo/ET/src/lib/api.ts` | 110 | `console.error` in production |
| `/opt/advanced-think-tank/repo/ET/src/stores/app.ts` | 200,249,252 | `console.error` in production |
| `/opt/advanced-think-tank/repo/ET/src/stores/auth.ts` | 135 | `console.error` in production |
| `/opt/advanced-think-tank/repo/ET/n8n/workflows/rag-query-pipeline.json` | 103 | Confidence double-multiplication bug |
| `/opt/advanced-think-tank/repo/ET/n8n/workflows/rss-ingestion-pipeline.json` | 7 | 2-hour interval vs documented 30min |
| `/opt/advanced-think-tank/repo/ET/n8n/workflows/rss-ingestion-pipeline.json` | 78 | Only 10 articles per feed |
| `/opt/advanced-think-tank/repo/ET/src/app/App.tsx` | 20 | `useLocaleStore.getState()` called in render method of class component (works but is a React anti-pattern) |
| `/opt/advanced-think-tank/app/Dockerfile` | 19 | Absolute host path `COPY /opt/advanced-think-tank/app/nginx.conf` — would fail in Docker build |
| `/etc/nginx/sites-enabled/et` | all | No TLS, no rate limiting |
| `/etc/nginx/sites-available/n8n` | all | No access control on n8n admin |
| `.github/workflows/deploy.yml` | 36 | `pnpm lint \|\| true` — lint errors silently ignored |

---

## 8. Quick Wins (< 1 Hour Each)

1. `ufw allow 22,80,443/tcp && ufw enable` — firewall
2. Change `"3000:80"` to `"127.0.0.1:3000:80"` in docker-compose, `docker compose up -d`
3. `certbot --nginx -d et.advanced-think-tank.com -d n8n.advanced-think-tank.com` — real TLS
4. `docker rm advanced-think-tank-app advanced-think-tank-n8n && docker network rm advanced-think-tank-net` — cleanup
5. `fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile` — swap
6. Remove `/webhook-test/` from production nginx configs
7. Add `auth_basic` to n8n nginx location

---

*Generated by infrastructure audit on 2026-03-07*
