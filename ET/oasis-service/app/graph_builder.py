"""Knowledge graph construction via entity extraction.

Extracts entities and relationships from article text using Claude,
then upserts them into Supabase PostgreSQL tables.
"""

from __future__ import annotations

import json
from typing import Optional

import anthropic
import httpx

from app.config import settings

EXTRACTION_PROMPT = """Analyze the following article and extract all named entities and their relationships.

Title: {title}
Content: {content}

Return a JSON object with two arrays:
{{
  "entities": [
    {{
      "name": "exact name",
      "entity_type": "person" | "organization" | "country" | "commodity" | "event" | "policy" | "technology",
      "description": "one-sentence description"
    }}
  ],
  "relationships": [
    {{
      "source": "entity name (exact match from entities array)",
      "target": "entity name (exact match from entities array)",
      "relationship_type": "brief label like 'sanctions', 'imports_from', 'regulates', 'competes_with'",
      "weight": 0.0 to 1.0 indicating strength of relationship
    }}
  ]
}}

Extract 5-15 entities max. Focus on geopolitically significant actors. Respond ONLY with JSON."""


async def extract_entities(
    articles: list[dict],
    story_id: Optional[str] = None,
) -> dict:
    """Extract entities and relationships from articles, store in Supabase.

    Args:
        articles: List of article dicts with id, title, content.
        story_id: Optional story UUID to link mentions to.

    Returns:
        Dict with entity and relationship counts.
    """
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    supabase_headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
        "Content-Type": "application/json",
        "Prefer": "resolution=merge-duplicates",
    }
    base_url = settings.supabase_url

    all_entities = {}  # name+type -> entity dict
    all_relationships = []
    entity_mentions = []

    for article in articles:
        title = article.get("title", "")
        content = article.get("content", article.get("excerpt", ""))
        if not content:
            continue

        content = content[:2000]
        prompt = EXTRACTION_PROMPT.format(title=title, content=content)

        try:
            response = client.messages.create(
                model=settings.llm_model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )
            raw = response.content[0].text.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
            data = json.loads(raw)
        except (json.JSONDecodeError, IndexError, anthropic.APIError):
            continue

        # Collect entities
        for ent in data.get("entities", []):
            key = (ent["name"].strip(), ent["entity_type"])
            if key not in all_entities:
                all_entities[key] = {
                    "name": ent["name"].strip(),
                    "entity_type": ent["entity_type"],
                    "description": ent.get("description", ""),
                    "mention_count": 1,
                }
            else:
                all_entities[key]["mention_count"] += 1

            entity_mentions.append({
                "entity_key": key,
                "article_id": article["id"],
                "story_id": story_id,
                "context_snippet": content[:200],
            })

        # Collect relationships
        for rel in data.get("relationships", []):
            all_relationships.append(rel)

    # Upsert entities to Supabase
    entity_id_map = {}  # (name, type) -> uuid
    async with httpx.AsyncClient(timeout=30) as http:
        for key, ent in all_entities.items():
            resp = await http.post(
                f"{base_url}/rest/v1/entities",
                headers={
                    **supabase_headers,
                    "Prefer": "resolution=merge-duplicates,return=representation",
                },
                json={
                    "name": ent["name"],
                    "entity_type": ent["entity_type"],
                    "description": ent["description"],
                    "mention_count": ent["mention_count"],
                    "last_seen_at": "now()",
                },
            )
            if resp.status_code in (200, 201) and resp.json():
                entity_id_map[key] = resp.json()[0]["id"]

        # Upsert relationships
        rel_count = 0
        for rel in all_relationships:
            source_key = next(
                (k for k in all_entities if k[0] == rel["source"]), None
            )
            target_key = next(
                (k for k in all_entities if k[0] == rel["target"]), None
            )
            if not source_key or not target_key:
                continue
            source_id = entity_id_map.get(source_key)
            target_id = entity_id_map.get(target_key)
            if not source_id or not target_id:
                continue

            resp = await http.post(
                f"{base_url}/rest/v1/entity_relationships",
                headers={
                    **supabase_headers,
                    "Prefer": "resolution=merge-duplicates",
                },
                json={
                    "source_entity_id": source_id,
                    "target_entity_id": target_id,
                    "relationship_type": rel["relationship_type"],
                    "weight": rel.get("weight", 1.0),
                    "last_seen_at": "now()",
                },
            )
            if resp.status_code in (200, 201):
                rel_count += 1

        # Upsert entity-article mentions
        mention_count = 0
        for mention in entity_mentions:
            entity_id = entity_id_map.get(mention["entity_key"])
            if not entity_id:
                continue

            body = {
                "entity_id": entity_id,
                "article_id": mention["article_id"],
                "context_snippet": mention["context_snippet"],
            }
            if mention["story_id"]:
                body["story_id"] = mention["story_id"]

            resp = await http.post(
                f"{base_url}/rest/v1/entity_article_mentions",
                headers={
                    **supabase_headers,
                    "Prefer": "resolution=merge-duplicates",
                },
                json=body,
            )
            if resp.status_code in (200, 201):
                mention_count += 1

    return {
        "entities_count": len(entity_id_map),
        "relationships_count": rel_count,
        "mentions_count": mention_count,
    }


async def get_graph(story_id: Optional[str] = None) -> dict:
    """Fetch entities and relationships from Supabase.

    Args:
        story_id: Optional filter to get entities related to a specific story.

    Returns:
        Dict with entities and relationships arrays.
    """
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    base_url = settings.supabase_url

    async with httpx.AsyncClient(timeout=15) as http:
        if story_id:
            # Get entities linked to this story via mentions
            mentions_resp = await http.get(
                f"{base_url}/rest/v1/entity_article_mentions",
                headers=headers,
                params={"story_id": f"eq.{story_id}", "select": "entity_id"},
            )
            if mentions_resp.status_code != 200:
                return {"entities": [], "relationships": []}

            entity_ids = list({
                m["entity_id"] for m in mentions_resp.json()
            })
            if not entity_ids:
                return {"entities": [], "relationships": []}

            id_filter = ",".join(entity_ids)
            ent_resp = await http.get(
                f"{base_url}/rest/v1/entities",
                headers=headers,
                params={"id": f"in.({id_filter})"},
            )
            rel_resp = await http.get(
                f"{base_url}/rest/v1/entity_relationships",
                headers=headers,
                params={
                    "or": f"(source_entity_id.in.({id_filter}),target_entity_id.in.({id_filter}))"
                },
            )
        else:
            ent_resp = await http.get(
                f"{base_url}/rest/v1/entities",
                headers=headers,
                params={"order": "mention_count.desc", "limit": "100"},
            )
            rel_resp = await http.get(
                f"{base_url}/rest/v1/entity_relationships",
                headers=headers,
                params={"limit": "500"},
            )

        entities = ent_resp.json() if ent_resp.status_code == 200 else []
        relationships = rel_resp.json() if rel_resp.status_code == 200 else []

    return {"entities": entities, "relationships": relationships}
