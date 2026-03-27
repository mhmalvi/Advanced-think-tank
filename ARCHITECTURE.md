# Advanced Think Tank — Geo-Economic Intelligence Platform

## What It Is

Advanced Think Tank is a real-time geo-economic intelligence platform that:
- Ingests articles from 18+ news sources via RSS every 30 minutes
- Embeds content into Pinecone vector search (multilingual-e5-large, 1024 dims)
- Answers analyst queries via RAG pipeline (Pinecone retrieval + bge-reranker + Claude synthesis)
- Supplements with live web search (Tavily + SerpAPI)
- Presents analysis with inline citations, confidence scoring, and source attribution

## Architecture

```
User → React SPA (Vite) → nginx → n8n webhooks → Pinecone + Claude → Response
                ↓
            Supabase (auth, data persistence, RLS)
```

### Stack
- **Frontend**: React 18 + TypeScript + Vite 6 + Tailwind CSS v4 + shadcn/ui + Zustand
- **Backend**: n8n (workflow automation) + Supabase (auth, DB, RLS)
- **Vector Search**: Pinecone (multilingual-e5-large embeddings, bge-reranker-v2-m3)
- **LLM**: Claude Haiku 4.5 (fast synthesis from retrieved context)
- **Infrastructure**: Hetzner VPS, Docker Compose, nginx reverse proxy
- **CI/CD**: GitHub Actions → SSH deploy → Docker rebuild

### Key Workflows (n8n)
1. **RAG Query Pipeline**: Webhook → Preprocess (abbreviation expansion) → Pinecone (top_k:15, rerank top_n:5) → Claude synthesis → JSON response
2. **RSS Ingestion**: Schedule (30min) → 18 feeds × 20 articles → Dual-write to Pinecone + Supabase
3. **Web Search**: Webhook → Tavily + SerpAPI parallel → Deduplicate → Upsert to Pinecone

### Data Flow
- 18 RSS sources → ~360 articles/cycle → Pinecone vectors + Supabase rows
- User query → expanded query → vector search → reranked top 5 → Claude analysis + citations
- Results cached client-side (5min TTL) with rate limiting (2s interval)

## What It Could Be

### Near-Term Enhancements
- **Alert System**: Automated briefings when significant events match user-defined topics
- **Saved Queries**: Persistent query templates with scheduled re-execution
- **Source Quality Scoring**: Track source reliability over time based on citation frequency and user feedback
- **Multi-Language Analysis**: Leverage multilingual embeddings for cross-language source synthesis
- **Dashboard Widgets**: Customizable panels for trending topics, source activity, query history

### Medium-Term Features
- **Collaborative Analysis**: Share analyses with team members, add annotations
- **Custom Source Integration**: Upload PDFs, add custom RSS feeds per user
- **Time-Series Tracking**: Track how a topic evolves across multiple queries over time
- **Entity Extraction**: Auto-tag articles with countries, organizations, policies for faceted search
- **Export & Reporting**: Generate PDF/email briefings from query results

### Long-Term Vision
- **Multi-Agent Intelligence**: Specialized agents for different domains (trade, energy, security)
- **Knowledge Graph**: Build structured relationships between entities across all ingested content
- **Predictive Analysis**: Pattern detection across historical data to surface emerging trends
- **API Access**: External API for programmatic access to the intelligence platform
- **White-Label**: Configurable platform for different intelligence domains

## Areas of Improvement

### Performance
- [ ] Stream Claude responses for perceived faster UX
- [ ] Pre-compute popular query embeddings
- [ ] Add server-side caching layer (Redis) for frequent queries

### Reliability
- [ ] Add error handling nodes to n8n workflows (currently fail silently)
- [ ] Implement retry logic for Pinecone/Claude API failures
- [ ] Add monitoring and alerting (uptime, query latency, ingestion failures)

### Data Quality
- [ ] Deduplicate articles across sources (same story, different outlets)
- [ ] Add content quality filtering (discard low-quality/paywall stubs)
- [ ] Implement embedding drift detection over time

### Security
- [x] n8n bound to localhost only
- [x] Security headers on all nginx locations
- [x] URL validation for XSS prevention
- [x] Input validation and rate limiting
- [ ] Add CSRF tokens for state-changing requests
- [ ] Implement API key rotation for n8n webhooks

### Developer Experience
- [x] Zero TypeScript errors
- [x] CI/CD pipeline with lint, build, deploy
- [x] Automated daily backups
- [ ] Add integration tests for RAG pipeline
- [ ] Add Storybook for UI component development
- [ ] Generate Supabase types from live schema (`supabase gen types`)
