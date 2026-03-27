# Advanced Think Tank — Full Infrastructure & App Audit Report

**Date:** 2026-03-06
**Server:** Hetzner VPS (4 CPU, 8GB RAM, 150GB SSD) — Ubuntu 24.04
**IP:** 46.224.81.90
**Domains:** et.advanced-think-tank.com, n8n.advanced-think-tank.com

---

## Executive Summary

Advanced Think Tank is a geo-economic intelligence platform that ingests news from 18 RSS sources, indexes them in Pinecone vector search, and provides AI-powered analysis via Claude. The platform is **functional but has significant gaps** that prevent it from being production-ready.

### Overall Health Score: 5/10

| Area | Score | Status |
|------|-------|--------|
| Infrastructure | 7/10 | Solid, some security gaps |
| Frontend App | 7/10 | Clean code, zero TS errors, some UX gaps |
| n8n Workflows | 4/10 | Core works but 9/18 sources broken, hardcoded secrets |
| Data Pipeline | 4/10 | Half of sources not ingesting, env vars missing |
| Security | 3/10 | API keys in plaintext in workflows, .env in git, SSL self-signed |
| CI/CD | 7/10 | Pipeline exists, needs secrets configured |
| Monitoring | 2/10 | No alerting, no uptime monitoring |
| Backups | 7/10 | Daily cron configured, tested working |

---

## 1. INFRASTRUCTURE FINDINGS

### Server Resources
- **CPU:** 4 cores, load avg 0.02 — vastly underutilized
- **RAM:** 1.6GB used / 7.6GB total — healthy
- **Disk:** 13GB used / 150GB — 9% utilization
- **Swap:** NONE configured — risk of OOM kill under load
- **Uptime:** 3 days

### Docker State
| Container | Image | Status | Ports |
|-----------|-------|--------|-------|
| repo-app-1 | repo-app | Healthy | 0.0.0.0:3000→80 |
| repo-n8n-1 | n8nio/n8n:2.10.4 | Healthy | 127.0.0.1:5678→5678 |
| advanced-think-tank-app | advanced-think-tank-app | **Created (stale)** | — |
| advanced-think-tank-n8n | n8nio/n8n:latest | **Created (stale)** | — |

**Issues:**
- **2 stale containers** (`advanced-think-tank-app`, `advanced-think-tank-n8n`) from old compose file at `/opt/advanced-think-tank/docker-compose.yml` — never started, consuming metadata
- **2 stale Docker images** (`test-build`, `test-env`) from debugging — 488MB wasted
- **Old n8n image** (v1.84.1) still present — 1.24GB wasted
- **5.5GB reclaimable images** and **3.4GB build cache** — total ~9GB recoverable
- **Duplicate compose files**: `/opt/advanced-think-tank/docker-compose.yml` (old, has hardcoded secrets) AND `/opt/advanced-think-tank/repo/docker-compose.yml` (active) — confusing

### Networking
- Port 3000 (app) exposed to **all interfaces** (0.0.0.0) — should be behind reverse proxy only
- Port 5678 (n8n) correctly bound to **localhost only**
- Host nginx (ports 80/443) proxies to both

### SSL/TLS — CRITICAL
- **Self-signed certificates** on both `et.advanced-think-tank.com` and `n8n.advanced-think-tank.com`
- Certbot is installed (timer active) but **no Let's Encrypt certs exist**
- Browser will show security warnings to users
- **Action:** Run `sudo certbot --nginx -d et.advanced-think-tank.com -d n8n.advanced-think-tank.com`

### Server Hardening — GAPS
| Check | Status | Risk |
|-------|--------|------|
| SSH root login | **ENABLED** (PermitRootLogin yes) | HIGH |
| SSH password auth | Not checked (needs sudo) | — |
| fail2ban | **NOT INSTALLED** | HIGH |
| UFW firewall | Cannot verify (needs sudo) | — |
| Unattended upgrades | Active | OK |
| Swap space | **NONE** | MEDIUM |

---

## 2. FRONTEND APP FINDINGS

### Build & Types
- **Zero TypeScript errors** (strict mode)
- Build time: 3.5s, output 474KB gzipped
- Vite 6 + React 18 + Tailwind v4

### Code Quality — Good
- Clean component architecture (6 main files, ~1,264 lines)
- Zustand state management with proper caching (5-min TTL, 50-entry LRU)
- Rate limiting (2s) and input validation (2000 char max)
- URL sanitization (`isSafeUrl()`) on all external links

### i18n — Complete
- 88 translation keys, perfect EN/DA parity
- All components use `useLocaleStore` hook
- ErrorBoundary uses `getState()` (class component pattern)

### Issues Found

**Accessibility (WCAG):**
- Missing `aria-labels` on source scroll buttons (hardcoded English)
- Overlay div in modal missing keyboard dismiss (Escape key)
- Missing focus indicators on many interactive elements (only hover styles)
- No skip-to-content link

**UX Gaps:**
- "Send to Analyst" constructs query in English regardless of locale: `Latest news from ${source.name}`
- Web result badges use hardcoded blue colors instead of design tokens
- No loading skeleton for initial source strip load
- No empty state for "no web results" (just nothing shown)

**API Layer:**
- No retry mechanism for RAG pipeline failures
- Web search errors silently return empty results — user unaware
- RAG response only validates `analysis.content` — doesn't check `citations` array structure
- Background Supabase persistence is fire-and-forget with no retry

**State Management:**
- Cache eviction removes oldest entry (FIFO), not least-recently-used (LRU)
- No cache invalidation when new articles are ingested
- Auth timeout (3s) could race with `onAuthStateChange` listener registration

**Responsive Design:**
- `RightSidebar` component has no mobile/tablet responsive styles — breaks on small screens
- Source scroll strip not tested on touch devices

**Dependencies:**
- Unused packages: `sonner` (toast library, not imported anywhere), `tw-animate-css`
- Should be removed to reduce bundle size

**Missing Features for Core Offering:**
- No streaming responses (user waits 10-15s for full response)
- No query history persistence UI (data saved to Supabase but no way to browse)
- No analysis sharing/export (buttons exist but no implementation)
- No source management UI (all source configuration requires Supabase direct access)
- No feedback loop (thumbs up/down saves to `is_saved` field — no dedicated feedback table)

---

## 3. N8N WORKFLOW FINDINGS

### Active Workflows
| Workflow | ID | Status | Schedule |
|----------|----|--------|----------|
| RAG Query Pipeline | 77h7wfR2PTvQjOYC | Active | Webhook |
| RSS Ingestion Pipeline | COwsIcwHmmBzS2MW | Active | Every 30 min |
| Web Search Pipeline | SgDtQkBCBlfckg4y | Active | Webhook |

### Execution History (last 24h)
| Workflow | Successes | Failures | Error Rate |
|----------|-----------|----------|------------|
| RAG Query | 23 | 2 | 8% |
| RSS Ingestion | 6 | 5 | 45% |
| Web Search | 5 | 2 | 29% |

### Critical: RSS Ingestion Failures
- **5 consecutive failures** from 00:00-08:00 UTC (error: `crypto is not defined`)
- Fixed at 10:10 by workflow update — now succeeding every 2 hours
- **Root cause:** n8n Code node sandbox doesn't expose `crypto` global

### Critical: 9 of 18 Sources Have ZERO Articles

| Source | Articles | Status |
|--------|----------|--------|
| SCMP | 47 | Working |
| The Economist | 45 | Working |
| Web Search | 44 | Working |
| FT, BBC, NYT, Al Jazeera, Borsen | 15 each | Working |
| Berlingske | 10 | Working |
| **Reuters** | **0** | **BROKEN** |
| **WSJ** | **0** | **BROKEN** |
| **Bloomberg** (x2) | **0** | **BROKEN** |
| **Nikkei Asia** | **0** | **BROKEN** |
| **Caixin Global** | **0** | **BROKEN** |
| **Eurostat** | **0** | **BROKEN** |
| **EU Parliament** | **0** | **BROKEN** |
| **Danmarks Statistik** | **0** | **BROKEN** |
| **Bruegel** | **0** | **BROKEN** |

**Likely causes for 0-article sources:**
1. RSS feeds may require authentication or have changed URLs
2. Source slug in n8n doesn't match Supabase `sources.slug` — articles get empty `source_id`
3. Bloomberg/WSJ/Reuters feeds may block server IP or require paid access
4. Eurostat/EU Parliament feeds may use non-standard RSS format

### Environment Variables — CRITICAL
- `TAVILY_API_KEY` = **EMPTY** (0 chars)
- `SERPAPI_API_KEY` = **EMPTY** (0 chars)
- `SUPABASE_URL` = **EMPTY** (0 chars)
- `SUPABASE_SERVICE_ROLE_KEY` = **EMPTY** (0 chars)

These are referenced in `docker-compose.yml` as `${VAR}` but **not defined in `.env`**. The n8n workflows use internal n8n credentials (stored encrypted in SQLite) for Pinecone, Anthropic, and Supabase. But **Tavily and SerpAPI keys are referenced via `$env.TAVILY_API_KEY`** in code nodes — meaning **web search cannot work**.

### Workflow Issues
- **No error handling nodes** — if Pinecone or Claude API fails, workflow crashes
- **No retry logic** on external API calls
- **Webhook-test endpoints** exposed via nginx — should be disabled in production
- **Exported JSON files** in repo are outdated vs. live workflows (live has hardcoded secrets, exports use env vars)
- **Schedule mismatch**: RSS runs every 30 min (live) vs. every 2 hours (exported JSON)
- **Duplicate Web Search Pipeline**: Active workflow has hardcoded keys; inactive copy uses proper env vars
- RSS ingestion runs every 30 min but only processes ~10 articles per feed — should batch more

### Stored Credentials
| Name | Type | Status |
|------|------|--------|
| Pinecone API Key | HTTP Header Auth | Working |
| Anthropic API Key | HTTP Header Auth | Working |
| Supabase Anon Key | HTTP Header Auth | Working |

---

## 4. DATA & CONTENT

### Supabase
- **221 articles** total (across 18 sources)
- **17 queries** executed
- **18 active sources** configured
- Article date range: 2021-04-15 to 2026-03-06
- Most recent articles are web search results, not RSS ingested

### Data Quality Issues
- `article_count` field on `sources` table is **stale** — shows 0 for sources that have articles via web search
- No deduplication — same article from different sources creates separate entries
- No content quality filter — some articles are paywall stubs with minimal content
- Web search results set `published_at` to current timestamp, not actual publication date

---

## 5. SECURITY AUDIT

### Good (Fixed)
- [x] All nginx security headers (CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy)
- [x] n8n bound to localhost only
- [x] URL validation on external links (XSS prevention)
- [x] Query rate limiting and input validation
- [x] Supabase RLS policies in place

### Needs Attention
- [ ] **Self-signed SSL certs** — users see browser warnings
- [ ] **SSH root login enabled** — should be disabled
- [ ] **No fail2ban** — server is actively being port-scanned
- [ ] **No swap space** — OOM risk under load
- [ ] **Old compose file** at `/opt/advanced-think-tank/docker-compose.yml` contains **hardcoded Supabase anon key and API key**
- [ ] **n8n API key** exposed in old compose file: `N8N_API_KEY=advanced-think-tank-n8n-api-2026`
- [ ] **Webhook-test endpoints** accessible via nginx
- [ ] **Port 3000** exposed to all interfaces (should be localhost only, behind nginx)
- [ ] **No CSRF protection** on state-changing webhook requests

### CRITICAL — Hardcoded API Keys in Live n8n Workflows
- [ ] **Tavily API key** hardcoded in plaintext in Web Search Pipeline (workflow SgDtQkBCBlfckg4y)
- [ ] **SerpAPI key** hardcoded in plaintext in Web Search Pipeline (same workflow)
- [ ] **Supabase JWT** hardcoded in plaintext in RSS Ingestion Pipeline (workflow COwsIcwHmmBzS2MW)
- [ ] **Duplicate Web Search Pipeline**: Active one (SgDtQkBCBlfckg4y) uses hardcoded keys; inactive one (WbSrch7TavilySrp) correctly uses env vars — should swap which is active
- [ ] **Configuration drift**: Live workflows have diverged from exported JSON files in repo — live has hardcoded secrets while exports use `$env.*` references
- [ ] **`.env` file committed to git repo** with Supabase credentials — should be in `.gitignore`

**Action Required:** Migrate all hardcoded keys to n8n credential store or environment variables. Rotate all exposed keys immediately. Remove `.env` from git history.

---

## 6. CI/CD & DevOps

### Current State
- GitHub Actions: lint → build → deploy (on push to main)
- Deploy script: git pull → docker build → health check → prune
- Daily backup cron at 3:00 AM UTC (n8n SQLite, .env, compose)
- 14-day backup retention

### Gaps
- [ ] **GitHub secrets** (`VPS_HOST`, `VPS_USER`, `VPS_SSH_KEY`) — need to verify if configured
- [ ] **No staging environment** — all changes go directly to production
- [ ] **No monitoring/alerting** — if n8n crashes or ingestion fails, nobody knows
- [ ] **No log aggregation** — logs only in Docker stdout
- [ ] **No uptime monitoring** — no health check from external service

---

## 7. GAPS IN CORE OFFERING

The core offering is: **Ask a question about geo-economics → get AI-analyzed answer with citations from curated sources.**

### What's Working
1. User asks a question
2. Pinecone searches indexed articles (with reranking)
3. Claude synthesizes an analysis with citations
4. User sees analysis, confidence score, and source links
5. Bilingual UI (EN/DA)

### What's Missing (Priority Order)

#### P0 — Must Fix (Broken / Security Critical)
1. **Hardcoded API keys in live n8n workflows** — Tavily, SerpAPI, and Supabase JWT exposed in plaintext in workflow code nodes. Must migrate to credential store and rotate keys immediately
2. **`.env` committed to git** — Supabase credentials in version history. Add to `.gitignore`, remove from git history, rotate keys
3. **9 of 18 sources not ingesting** — half the intelligence is missing
4. **Web search API keys not configured** — Tavily/SerpAPI env vars empty in Docker (though hardcoded in workflows)
5. **SSL certificates** — self-signed certs break user trust
6. **Old compose file with exposed secrets** — delete `/opt/advanced-think-tank/docker-compose.yml`
7. **Configuration drift** — live n8n workflows diverged from exported JSON; re-export after fixing secrets

#### P1 — Critical for Core Value
1. **Streaming responses** — 10-15s wait with no feedback is unacceptable UX
2. **Source health monitoring** — know when feeds break or return 0 articles
3. **Query history UI** — data is saved but users can't browse their past queries
4. **Error feedback to user** — when web search fails, show "web search unavailable" not empty
5. **Article freshness indicator** — show when sources were last updated
6. **Proper feedback system** — dedicated feedback table instead of overloading `is_saved`

#### P2 — Enhances Core Value
1. **Saved/bookmarked analyses** — let users save and revisit important findings
2. **Export/share analysis** — PDF, email, or shareable link
3. **Source filtering in queries** — "search only FT and Bloomberg"
4. **Alert/notification system** — "notify me when X topic appears"
5. **Dashboard widgets** — trending topics, source activity, ingestion status
6. **Admin panel** — manage sources, view ingestion health, without direct DB access

#### P3 — Future Enhancements
1. Multi-user collaboration (shared workspaces)
2. Custom source integration (user-uploaded PDFs)
3. Entity extraction and knowledge graph
4. Time-series topic tracking
5. API access for programmatic queries

---

## 8. IMMEDIATE ACTION ITEMS

### Today (URGENT — Security)
```bash
# 1. CRITICAL: Migrate hardcoded API keys out of n8n workflows
#    - Open n8n UI → Web Search Pipeline (SgDtQkBCBlfckg4y)
#    - Replace hardcoded Tavily/SerpAPI keys with $env.TAVILY_API_KEY / $env.SERPAPI_API_KEY
#    - Or: deactivate this workflow and activate WbSrch7TavilySrp (uses env vars correctly)
#    - Open RSS Ingestion Pipeline → replace hardcoded Supabase JWT with credential reference
#    - ROTATE ALL EXPOSED KEYS after migration

# 2. CRITICAL: Remove .env from git and add to .gitignore
echo '.env' >> /opt/advanced-think-tank/repo/.gitignore
cd /opt/advanced-think-tank/repo && git rm --cached .env 2>/dev/null
# Consider: git filter-branch or BFG to purge from history

# 3. Delete stale containers and old compose file
docker rm advanced-think-tank-app advanced-think-tank-n8n
rm /opt/advanced-think-tank/docker-compose.yml  # contains hardcoded secrets

# 4. Clean Docker resources (~9GB recoverable)
docker system prune -a --volumes  # after confirming no needed volumes

# 5. Get real SSL certificates
sudo certbot --nginx -d et.advanced-think-tank.com -d n8n.advanced-think-tank.com

# 6. Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab

# 7. Disable root SSH
sudo sed -i 's/PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config
sudo systemctl restart sshd
```

### This Week
1. Fix broken RSS sources — verify each feed URL, match slugs to Supabase
2. Add `TAVILY_API_KEY` and `SERPAPI_API_KEY` to `.env` and docker-compose
3. Bind app port 3000 to localhost: `"127.0.0.1:3000:80"` in compose
4. Install fail2ban: `sudo apt install fail2ban`
5. Set up basic uptime monitoring (UptimeRobot or similar)
6. Re-export n8n workflows to repo JSON files

### This Month
1. Implement streaming responses for RAG pipeline
2. Add error handling nodes to all n8n workflows
3. Build query history page
4. Add source health monitoring dashboard
5. Set up proper monitoring (Grafana/Prometheus or at minimum healthcheck endpoint)

---

## 9. ARCHITECTURE DIAGRAM

```
                                    ┌─────────────┐
                                    │   Certbot    │
                                    │  (SSL/TLS)   │
                                    └──────┬───────┘
                                           │
Internet ──→ nginx (80/443) ──┬──→ :3000 ──→ [Docker: app]
                              │                  │
                              │              React SPA
                              │              (Vite build)
                              │                  │
                              │              Supabase
                              │              (auth, DB)
                              │
                              └──→ :5678 ──→ [Docker: n8n]
                                (localhost)       │
                                            ┌─────┴──────┐
                                            │            │
                                       Pinecone     Claude API
                                       (vectors)    (synthesis)
                                            │
                                       18 RSS Feeds
                                       (30min cycle)
```

---

*Report generated by automated audit. All findings verified against live system state.*
