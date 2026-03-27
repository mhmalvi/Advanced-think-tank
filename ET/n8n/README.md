# Advanced Think Tank n8n Workflows

## n8n Instance

- **URL:** https://n8n.your-domain.com/

## Prerequisites

- n8n instance running (Docker on Hetzner VPS)
- Pinecone API key
- Anthropic API key (for Claude)
- Supabase service role key

## Environment Variables (set in n8n Settings > Variables)

- `SUPABASE_URL` — e.g. `https://urppgmoexiuthsancgfj.supabase.co`
- `SUPABASE_SERVICE_ROLE_KEY` — service role JWT (NOT the anon key)

## Credentials to configure in n8n

### 1. Pinecone API Key (HTTP Header Auth)

- Name: `Pinecone API Key`
- Header Name: `Api-Key`
- Header Value: `<your-pinecone-api-key>`

### 2. Anthropic API Key (HTTP Header Auth)

- Name: `Anthropic API Key`
- Header Name: `x-api-key`
- Header Value: `<your-anthropic-api-key>`

### 3. Supabase Service Role Key (HTTP Header Auth)

- Name: `Supabase Service Role Key`
- Header Name: `Authorization`
- Header Value: `Bearer <your-service-role-key>`

## Workflows

### RAG Query Pipeline (`rag-query-pipeline.json`)

**Trigger:** Webhook POST to `/webhook/att-query`

**Flow:**

1. Receives `{ query_text, query_id }` via webhook
2. Searches Pinecone articles index with multilingual-e5-large embeddings
3. Reranks results with bge-reranker-v2-m3
4. Sends top 3 results + query to Claude for synthesis
5. Returns structured JSON with analysis + citations

**Setup:**

1. Import workflow into n8n
2. Update credential IDs in "Search Pinecone" and "LLM Synthesis" nodes
3. Activate workflow
4. Set `VITE_N8N_WEBHOOK_URL=https://n8n.your-domain.com/webhook` in frontend `.env`

### RSS Ingestion Pipeline (`rss-ingestion-pipeline.json`)

**Trigger:** Schedule (every 2 hours)

**Flow:**

1. Fetches source slug-to-ID mapping from Supabase dynamically
2. Iterates over configured RSS feeds
3. Reads latest articles from each feed
4. Processes and cleans HTML content
5. Derives deterministic article IDs from URL hashes (for deduplication)
6. Dual-writes to Pinecone (vector search) and Supabase (frontend display)

**Setup:**

1. Import workflow into n8n
2. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in n8n environment variables
3. Update Pinecone credential ID
4. Edit "Feed List" code node to customize RSS sources
5. Activate workflow

## Pinecone Index

- **Name:** `att-articles`
- **Embedding model:** `multilingual-e5-large` (1024 dims, integrated)
- **Namespace:** `articles`
- **Host:** `att-articles-8xhwcso.svc.aped-4627-b74a.pinecone.io`

## Testing

POST to the webhook to test:

```bash
curl -X POST https://n8n.your-domain.com/webhook/att-query \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_SECRET" \
  -d '{"query_text": "China semiconductor policy", "query_id": "test-001"}'
```
