# Advanced Think Tank — Comprehensive Codebase Audit Report

**Date**: 2026-03-09
**Auditor**: Claude Opus 4.6
**Production Readiness Score**: 8.5/10

## 1. Overall System Architecture

**Pattern**: Monolithic SPA + BaaS + Workflow Engine

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  React SPA   │────▶│   Supabase   │────▶│ PostgreSQL  │
│  (Vite/TS)   │     │  (Auth+API)  │     │  (6 tables) │
└──────┬───────┘     └──────────────┘     └─────────────┘
       │                                         ▲
       │             ┌──────────────┐             │
       └────────────▶│     n8n      │─────────────┘
                     │ (3 workflows)│────▶ Pinecone
                     └──────────────┘────▶ OpenAI
                                   └────▶ Tavily/SerpAPI
```

- **Frontend**: React 18.3.1 + Vite 6.4.1 + TypeScript 5.9.3 (ES2022), served via nginx
- **Backend**: Supabase (PostgreSQL + Auth + Row-Level Security), no custom server
- **AI Pipeline**: n8n orchestrates RAG queries (OpenAI embeddings → Pinecone → GPT-4o synthesis), web search (Tavily/SerpAPI), and RSS ingestion (18 feeds)
- **State**: Zustand 5.0.11 (slice-based) + TanStack React Query 5.90.21
- **Infrastructure**: Docker Compose on single VPS (46.224.81.90), nginx reverse proxy, Let's Encrypt SSL via CloudFlare
- **Deployment**: Blue-green via `deploy.sh`, GitHub Actions CI/CD (4 jobs)
- **Codebase**: ~8,370 lines TypeScript across 85 files (excluding node_modules)

## 2. Key Components and Responsibilities

### Frontend (14 components, 4 stores, 2 pages)

| Component               | Lines | Responsibility                                                                                                               |
| ----------------------- | ----- | ---------------------------------------------------------------------------------------------------------------------------- |
| `App.tsx`               | 105   | Routing, error boundary, QueryClientProvider, theme/auth init                                                                |
| `DashboardPage.tsx`     | 165   | Layout orchestration (3-panel: nav + content + sidebar)                                                                      |
| `AnswerArea.tsx`        | 378   | Query results, citations, export, feedback, streaming animation                                                              |
| `OverviewDashboard.tsx` | 283   | Ground News-style home view with lens-matched articles                                                                       |
| `SettingsModal.tsx`     | 235   | User preferences (topics, geographies, lenses)                                                                               |
| `LeftNav.tsx`           | 212   | Navigation, saved/recent queries, sources, settings access                                                                   |
| `RightSidebar.tsx`      | 188   | System health, query count, recent activity, "Send to Analyst"                                                               |
| `AuthPage.tsx`          | 165   | Login/signup UI with branding                                                                                                |
| `QueryArea.tsx`         | 101   | Search input with Cmd+K shortcut, quick query buttons                                                                        |
| `SourceStrip.tsx`       | 96    | Horizontal source filter chips with live counts                                                                              |
| `answer/*` (8 files)    | 710   | CitationContent, CitationList, ExportMenu, FeedbackBar, MethodologyModal, ProgressiveLoader, SourceBrowser, WebSearchResults |

### Stores (Zustand)

| Store                   | Lines | Scope                                                   |
| ----------------------- | ----- | ------------------------------------------------------- |
| `slices/querySlice.ts`  | 396   | Query submission, 5-min TTL cache, feedback, web search |
| `slices/sourceSlice.ts` | 146   | Sources, articles, browsing, system health              |
| `slices/uiSlice.ts`     | 90    | Panel state, navigation, error clearing                 |
| `auth.ts`               | 187   | Supabase auth with error sanitization, 3s init timeout  |
| `settings.ts`           | 106   | Topics, geographies, lenses (localStorage persist)      |
| `locale.ts`             | 40    | i18n (EN/DA) with localStorage persist                  |

### Backend (n8n Workflows)

| Workflow      | Trigger      | Function                                         |
| ------------- | ------------ | ------------------------------------------------ |
| RAG Query     | Webhook POST | Embed query → Pinecone search → GPT-4o synthesis |
| Web Search    | Webhook POST | Tavily + SerpAPI → GPT-4o synthesis              |
| RSS Ingestion | Cron (6h)    | Fetch 18 RSS feeds → dedupe → store articles     |

### Database (6 tables with RLS)

`profiles`, `sources`, `articles`, `queries`, `analyses`, `citations` — all protected by Row-Level Security policies scoped to `auth.uid()`, with RLS hardening migration preventing role escalation.

## 3. Code Quality and Maintainability

### Strengths

- TypeScript strict mode with `noUncheckedIndexedAccess`, zero `any` types
- Slice-based Zustand architecture, clean component decomposition (largest: 396 lines)
- All magic numbers extracted to `src/lib/constants.ts` (21 constants)
- Structured JSON logging via `src/lib/logger.ts`
- Complete i18n: 200+ keys in EN + DA, error messages internationalized
- JSDoc on 27 key functions across 8 files
- ESLint 10 + Prettier + Husky pre-commit hooks + lint-staged
- Clean imports with `@/` path alias, code splitting (4 vendor chunks + lazy routes)
- Safe utilities: `safeFormatDate()`, `safeFormatDateTime()`, `cn()`, `isSafeUrl()`

### Issues

| Severity | Issue                                                                         | Location                                                                 |
| -------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Low**  | 7 ESLint warnings (all `react-refresh/only-export-components` from shadcn/ui) | `ExportMenu.tsx`, `badge.tsx`, `button.tsx`, `sidebar.tsx`, `toggle.tsx` |
| **Low**  | No `React.memo()` on pure display components                                  | `CitationContent`, `ProgressiveLoader`, `FeedbackBar`                    |
| **Low**  | `document.execCommand("copy")` is deprecated (works but legacy)               | `AnswerArea.tsx:161`                                                     |

## 4. Security Risks and Vulnerabilities

### Critical

| #   | Risk                                              | Location                                                                                                     |
| --- | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| 1   | **GitHub PAT exposed in git remote URL**          | `.git/config` contains `ghp_qVSQ...` token in origin URL                                                     |
| 2   | **n8n live workflows contain hardcoded API keys** | Active workflows have Tavily, SerpAPI keys hardcoded (exported JSON uses `$env.*` but live instances differ) |

### Medium

| #   | Risk                                                     | Location                                                |
| --- | -------------------------------------------------------- | ------------------------------------------------------- |
| 3   | Backup files unencrypted (contain `.env` and n8n SQLite) | `/opt/jaegeren/backups/`                                |
| 4   | Sidebar cookie missing `SameSite=Strict; Secure` flags   | `src/app/components/ui/sidebar.tsx:75`                  |
| 5   | Docker base images not pinned to patch version           | `Dockerfile` uses `node:20-alpine`, `nginx:1.27-alpine` |
| 6   | GitHub Actions not SHA-pinned (major version only)       | `.github/workflows/deploy.yml`                          |

### Good Practices In Place

- RLS policies scope all queries to `auth.uid()`, role escalation prevented
- Zero XSS vectors: no `dangerouslySetInnerHTML`, `document.write`, `eval`, `innerHTML`
- All Supabase queries parameterized (no SQL injection risk)
- Auth errors sanitized (no internal message leakage)
- CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy all configured
- Webhook rate limiting (10r/s, burst 20) at nginx level
- n8n port bound to 127.0.0.1 only
- Non-root Docker containers (`USER nginx`)
- Input validation: trim, length check, dedup on all user inputs
- Let's Encrypt SSL with auto-renewal, TLS 1.2+, strong ciphers

## 5. Performance and Scalability

| Severity   | Issue                                                                    |
| ---------- | ------------------------------------------------------------------------ |
| **High**   | Single VPS = no horizontal scaling, no redundancy                        |
| **Medium** | No external monitoring/alerting integration (local health-check.sh only) |
| **Low**    | No `React.memo()` on frequently re-rendered pure components              |
| **Low**    | E2E tests only cover chromium (no Firefox/Safari)                        |

### Optimizations In Place

- React Query with 5-min staleTime, `refetchOnWindowFocus: false`
- In-memory query cache (5-min TTL, max 50 entries) with rate limiting (2s min interval)
- RAG + web search run in parallel (`Promise.all`)
- Vite code splitting: 4 manual chunks + lazy-loaded routes
- nginx gzip compression, 1-year immutable cache on `/assets/`
- No-cache on `index.html` (instant deploys)
- All Zustand selectors atomic (no wasted re-renders)
- All expensive computations wrapped in `useMemo`/`useCallback`
- Zero memory leaks: all event listeners and intervals properly cleaned

Estimated ceiling: ~50 concurrent users before VPS degradation.

## 6. Dependency and Third-Party Risk

### Vulnerabilities

- `pnpm audit`: **0 known vulnerabilities**

### Dependencies (41 prod, 14 dev)

| Category       | Packages                                      | Status  |
| -------------- | --------------------------------------------- | ------- |
| React + Router | react 18.3.1, react-router-dom 7.13.1         | Current |
| State          | zustand 5.0.11, @tanstack/react-query 5.90.21 | Current |
| UI             | 27 @radix-ui components, lucide-react 0.487.0 | Current |
| Backend        | @supabase/supabase-js 2.98.0                  | Current |
| Build          | vite 6.4.1, typescript 5.9.3                  | Current |
| Testing        | vitest 4.0.18, playwright 1.58.2              | Current |
| Quality        | eslint 10.0.3, prettier 3.8.1, husky 9.1.7    | Current |

### Vendor Lock-in

- **Supabase**: HIGH — Auth, database, RLS all coupled
- **Pinecone**: MEDIUM — replaceable with pgvector
- **n8n**: MEDIUM — workflow logic in JSON, not code
- **OpenAI**: LOW — abstracted through n8n

### Supply Chain

- `pnpm-lock.yaml` committed and frozen in CI (`--frozen-lockfile`)
- Dependabot configured: npm weekly, Docker monthly, Actions weekly
- No duplicate functionality across dependencies
- All dependencies verified in use (zero unused packages)

## 7. Technical Debt and Refactoring Opportunities

### High Priority

1. **Rotate GitHub PAT** — exposed in `.git/config` remote URL
2. **Migrate n8n hardcoded secrets** — active workflows should use `$env.*` variables
3. **Encrypt backups** — GPG or similar for `/opt/jaegeren/backups/`

### Medium Priority

4. Pin Docker base images to patch versions (e.g., `node:20.11.0-alpine`)
5. Pin GitHub Actions to SHA hashes for supply chain security
6. Add `SameSite=Strict; Secure` to sidebar cookie
7. Modernize clipboard copy to Clipboard API (`navigator.clipboard.writeText`)
8. Add external monitoring integration (Sentry, Uptime Robot, or similar)
9. Evaluate pgvector migration to reduce Pinecone dependency
10. Add staging environment for pre-production testing

### Low Priority

11. Add `React.memo()` to pure display components (`CitationContent`, `ProgressiveLoader`, `FeedbackBar`)
12. Expand Playwright browser matrix (Firefox, Safari)
13. Add HEALTHCHECK directive to Dockerfile (currently only in docker-compose)
14. Implement CSP reporting endpoint for monitoring

## 8. Testing and DevOps Evaluation

### Testing

| Area                   | Coverage                                             | Score |
| ---------------------- | ---------------------------------------------------- | ----- |
| Unit tests (Vitest)    | 32 tests — `cn()`, date utils, settings store        | 5/10  |
| E2E tests (Playwright) | 7 tests — smoke, auth redirect, headers, SPA routing | 4/10  |
| TypeScript             | Zero errors, strict mode                             | 10/10 |
| Linting                | 0 errors, 7 warnings (shadcn exports)                | 9/10  |

**Untested critical paths**: Auth flow (login/signup), query submission, RAG response handling, citation interaction, export, source browsing, querySlice/sourceSlice stores, error boundaries.

### CI/CD

| Feature                | Status                                                     |
| ---------------------- | ---------------------------------------------------------- |
| Pipeline               | 4 jobs: check → e2e → build → deploy                       |
| Triggers               | Push/PR to main (path-filtered to ET/)                     |
| Concurrency            | Cancel-in-progress for non-main branches                   |
| Secrets                | GitHub Secrets (VPS_HOST, VPS_USER, VPS_SSH_KEY)           |
| Environment protection | `production` environment configured                        |
| Deployment             | Blue-green with automatic rollback on health check failure |
| Monitoring             | health-check.sh cron every 5min (app, n8n, Docker, disk)   |
| Backups                | Daily at 3AM UTC, 14-day retention (n8n DB, .env, compose) |

### Infrastructure Status

| Service      | Status                                                 |
| ------------ | ------------------------------------------------------ |
| jaegeren-app | Up, healthy                                            |
| jaegeren-n8n | Up, healthy                                            |
| SSL          | Let's Encrypt (et.20thousandleagues.com), auto-renewal |
| CloudFlare   | DNS proxy configured                                   |
| HTTPS        | 200 OK                                                 |

## 9. Actionable Recommendations

### P0 — Critical (This Week)

1. **Rotate GitHub PAT** — token `ghp_qVSQ...` exposed in `.git/config`; regenerate and use credential helper or SSH key instead
2. **Fix n8n live workflow secrets** — migrate hardcoded Tavily/SerpAPI/Supabase keys to n8n environment variables in the active workflows

### P1 — High (This Month)

3. Encrypt backup archives (GPG) — `/opt/jaegeren/backups/` contains .env and n8n database
4. Pin Docker images to patch versions in Dockerfile
5. Pin GitHub Actions to commit SHAs in workflow
6. Add external uptime monitoring (Uptime Robot, Better Uptime, or similar)
7. Expand test coverage: auth flow, query submission, store slices (~60% coverage target)

### P2 — Medium (Next Quarter)

8. Add `SameSite=Strict; Secure` to sidebar cookie
9. Modernize clipboard to Clipboard API
10. Add staging environment for pre-production validation
11. Evaluate pgvector to reduce Pinecone dependency
12. Add Sentry or equivalent error reporting

### P3 — Low (Backlog)

13. Add `React.memo()` to pure display components
14. Expand Playwright to Firefox + Safari
15. Add Dockerfile HEALTHCHECK
16. Implement CSP reporting endpoint
17. Add Lighthouse CI for performance regression tracking

**Production Readiness Score: 8.5/10**

| Category        | Score                                          |
| --------------- | ---------------------------------------------- |
| Architecture    | 9/10                                           |
| Code Quality    | 9/10                                           |
| Security        | 7.5/10 (PAT exposure, n8n hardcoded keys)      |
| Performance     | 8/10                                           |
| Testing         | 5/10 (basic coverage, critical paths untested) |
| DevOps          | 8.5/10                                         |
| Dependencies    | 9/10                                           |
| Maintainability | 8.5/10                                         |
