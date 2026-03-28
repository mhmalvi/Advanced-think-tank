"""FastAPI application for the OASIS simulation intelligence service.

Provides endpoints for running social simulations, building knowledge graphs,
generating predictions, and creating analysis reports.
"""

from __future__ import annotations

import asyncio
from typing import Optional

import httpx
from fastapi import FastAPI, BackgroundTasks, HTTPException

from app.config import settings
from app.models import (
    SimulateRequest,
    SimulateResponse,
    SimulationResult,
    GraphBuildRequest,
    GraphResponse,
    PredictRequest,
    PredictResponse,
    ReportRequest,
    ReportResponse,
)
from app.simulation import run_simulation
from app.graph_builder import extract_entities, get_graph
from app.report_agent import generate_report

import anthropic

app = FastAPI(
    title="OASIS Simulation Intelligence",
    description="Social simulation and knowledge graph service for Advanced Think Tank",
    version="1.0.0",
)

# In-memory store for simulation runs (ephemeral — results also persist to Supabase)
_runs: dict[str, dict] = {}
_reports: dict[str, dict] = {}


# ── Health ──────────────────────────────────────────────────

@app.get("/health")
async def health():
    """Service health check."""
    return {
        "status": "ok",
        "model": settings.llm_model,
        "max_agents": settings.max_agents,
    }


# ── Simulation ──────────────────────────────────────────────

@app.post("/simulate", response_model=SimulateResponse)
async def simulate(req: SimulateRequest, background_tasks: BackgroundTasks):
    """Trigger an OASIS simulation (async).

    Fetches stories from Supabase, runs simulation in background,
    stores results in Supabase. Poll /results/{run_id} for status.
    """
    if req.agent_count > settings.max_agents:
        raise HTTPException(
            status_code=400,
            detail=f"agent_count exceeds max ({settings.max_agents})",
        )

    # Fetch stories from Supabase
    stories = await _fetch_stories(req.story_ids)
    if not stories:
        raise HTTPException(status_code=404, detail="No stories found")

    # Create placeholder run
    placeholder = {
        "run_id": "",
        "status": "pending",
        "agent_count": req.agent_count,
        "simulation_steps": req.simulation_steps,
        "story_count": len(stories),
    }

    background_tasks.add_task(
        _run_and_store,
        stories=stories,
        agent_count=req.agent_count,
        simulation_steps=req.simulation_steps,
    )

    # We'll get the run_id from the simulation — return a temp one
    import uuid
    temp_run_id = str(uuid.uuid4())
    placeholder["run_id"] = temp_run_id
    _runs[temp_run_id] = placeholder

    return SimulateResponse(run_id=temp_run_id, status="pending")


@app.get("/results/{run_id}", response_model=SimulationResult)
async def get_results(run_id: str):
    """Poll for simulation results."""
    if run_id in _runs:
        return SimulationResult(**_runs[run_id])

    # Check Supabase
    result = await _fetch_run_from_supabase(run_id)
    if result:
        return SimulationResult(**result)

    raise HTTPException(status_code=404, detail="Run not found")


# ── Knowledge Graph ─────────────────────────────────────────

@app.post("/graph/build")
async def build_graph(req: GraphBuildRequest):
    """Build knowledge graph from articles by extracting entities and relationships."""
    articles = await _fetch_articles(req.article_ids)
    if not articles:
        raise HTTPException(status_code=404, detail="No articles found")

    result = await extract_entities(articles, story_id=req.story_id)
    return result


@app.get("/graph/{project_id}", response_model=GraphResponse)
async def get_graph_data(project_id: str):
    """Get knowledge graph nodes and edges.

    project_id can be a story_id or 'all' for the full graph.
    """
    story_id = None if project_id == "all" else project_id
    data = await get_graph(story_id=story_id)
    return GraphResponse(**data)


@app.get("/graph/{project_id}/entities")
async def get_entities(
    project_id: str,
    entity_type: Optional[str] = None,
    limit: int = 50,
):
    """Get entities with optional filtering."""
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    params = {"order": "mention_count.desc", "limit": str(limit)}
    if entity_type:
        params["entity_type"] = f"eq.{entity_type}"

    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.get(
            f"{settings.supabase_url}/rest/v1/entities",
            headers=headers,
            params=params,
        )
    return resp.json() if resp.status_code == 200 else []


# ── Prediction ──────────────────────────────────────────────

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest):
    """Run a what-if scenario prediction using Claude."""
    context_parts = [f"Scenario: {req.scenario}"]

    # Fetch related story if provided
    if req.story_id:
        stories = await _fetch_stories([req.story_id])
        if stories:
            s = stories[0]
            context_parts.append(
                f"Related story: {s.get('title', '')}\n{s.get('synthetic_content', '')[:1000]}"
            )

    # Fetch related entities if provided
    if req.entity_ids:
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
        }
        async with httpx.AsyncClient(timeout=10) as http:
            id_filter = ",".join(req.entity_ids)
            resp = await http.get(
                f"{settings.supabase_url}/rest/v1/entities",
                headers=headers,
                params={"id": f"in.({id_filter})"},
            )
            if resp.status_code == 200:
                for ent in resp.json():
                    context_parts.append(
                        f"Entity: {ent['name']} ({ent['entity_type']}): {ent.get('description', '')}"
                    )

    prompt = f"""You are a geopolitical intelligence analyst. Analyze this what-if scenario and predict outcomes.

{chr(10).join(context_parts)}

Respond with a JSON object:
{{
  "analysis": "2-3 paragraph analysis of likely outcomes",
  "impact_scores": {{
    "market": 0.0-1.0,
    "political": 0.0-1.0,
    "social": 0.0-1.0,
    "energy": 0.0-1.0,
    "security": 0.0-1.0
  }},
  "affected_entities": ["list of entity names most affected"],
  "confidence": 0.0-1.0
}}

Respond ONLY with JSON."""

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    try:
        response = client.messages.create(
            model=settings.llm_model,
            max_tokens=1024,
            messages=[{"role": "user", "content": prompt}],
        )
        raw = response.content[0].text.strip()
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
        data = __import__("json").loads(raw)
    except Exception:
        data = {
            "analysis": "Unable to generate prediction at this time.",
            "impact_scores": {},
            "affected_entities": [],
            "confidence": 0.0,
        }

    return PredictResponse(
        scenario=req.scenario,
        analysis=data.get("analysis", ""),
        impact_scores=data.get("impact_scores", {}),
        affected_entity_ids=data.get("affected_entities", []),
        confidence=data.get("confidence", 0.0),
    )


# ── Reports ─────────────────────────────────────────────────

@app.post("/report/generate", response_model=ReportResponse)
async def create_report(req: ReportRequest):
    """Generate an analysis report from simulation data."""
    if req.run_id in _runs:
        run_data = _runs[req.run_id]
    else:
        run_data = await _fetch_run_from_supabase(req.run_id)
        if not run_data:
            raise HTTPException(status_code=404, detail="Run not found")

    result = await generate_report(run_data, fmt=req.format)
    _reports[result["report_id"]] = result
    return ReportResponse(**result)


@app.get("/report/{report_id}", response_model=ReportResponse)
async def get_report(report_id: str):
    """Retrieve a generated report."""
    if report_id not in _reports:
        raise HTTPException(status_code=404, detail="Report not found")
    return ReportResponse(**_reports[report_id])


# ── Internal Helpers ────────────────────────────────────────

async def _fetch_stories(story_ids: list[str]) -> list[dict]:
    """Fetch stories from Supabase by IDs."""
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    id_filter = ",".join(story_ids)
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.get(
            f"{settings.supabase_url}/rest/v1/stories",
            headers=headers,
            params={
                "id": f"in.({id_filter})",
                "select": "id,title,synopsis,synthetic_content",
            },
        )
    return resp.json() if resp.status_code == 200 else []


async def _fetch_articles(article_ids: list[str]) -> list[dict]:
    """Fetch articles from Supabase by IDs."""
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    id_filter = ",".join(article_ids)
    async with httpx.AsyncClient(timeout=15) as http:
        resp = await http.get(
            f"{settings.supabase_url}/rest/v1/articles",
            headers=headers,
            params={
                "id": f"in.({id_filter})",
                "select": "id,title,content,excerpt",
            },
        )
    return resp.json() if resp.status_code == 200 else []


async def _run_and_store(
    stories: list[dict],
    agent_count: int,
    simulation_steps: int,
):
    """Background task: run simulation and store results in Supabase."""
    try:
        result = await run_simulation(stories, agent_count, simulation_steps)
        run_id = result["run_id"]

        # Update in-memory cache
        # Find the temp run_id that maps to this execution
        for temp_id, run_data in list(_runs.items()):
            if run_data["status"] == "pending":
                _runs[temp_id] = result
                # Also store under the real run_id
                _runs[run_id] = result
                break

        # Persist to Supabase
        headers = {
            "apikey": settings.supabase_service_role_key,
            "Authorization": f"Bearer {settings.supabase_service_role_key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        }
        base_url = settings.supabase_url

        async with httpx.AsyncClient(timeout=30) as http:
            # Insert simulation_runs
            run_row = {
                "run_id": run_id,
                "status": result["status"],
                "agent_count": result["agent_count"],
                "simulation_steps": result["simulation_steps"],
                "story_count": result["story_count"],
                "total_actions": result["total_actions"],
                "polarization_index": result["polarization_index"],
                "echo_chamber_score": result["echo_chamber_score"],
                "duration_seconds": result["duration_seconds"],
                "completed_at": "now()",
            }
            run_resp = await http.post(
                f"{base_url}/rest/v1/simulation_runs",
                headers=headers,
                json=run_row,
            )

            if run_resp.status_code in (200, 201) and run_resp.json():
                db_run_id = run_resp.json()[0]["id"]

                # Insert per-story metrics
                for m in result["metrics"]:
                    await http.post(
                        f"{base_url}/rest/v1/simulation_metrics",
                        headers=headers,
                        json={
                            "run_id": db_run_id,
                            "story_id": m["story_id"],
                            "engagement_rate": m["engagement_rate"],
                            "sentiment_ratio": m["sentiment_ratio"],
                            "share_velocity": m["share_velocity"],
                            "predicted_virality": m["predicted_virality"],
                            "like_count": m["like_count"],
                            "dislike_count": m["dislike_count"],
                            "share_count": m["share_count"],
                            "comment_count": m["comment_count"],
                            "propagation_depth": m["propagation_depth"],
                        },
                    )

                # Update stories with sim results + blended confidence score
                for m in result["metrics"]:
                    # Fetch current confidence_score to blend with sim data
                    story_resp = await http.get(
                        f"{base_url}/rest/v1/stories",
                        headers=headers,
                        params={
                            "id": f"eq.{m['story_id']}",
                            "select": "confidence_score",
                        },
                    )
                    base_confidence = 0.5
                    if story_resp.status_code == 200 and story_resp.json():
                        base_confidence = float(
                            story_resp.json()[0].get("confidence_score") or 0.5
                        )

                    # Blend: 60% editorial confidence + 25% engagement + 15% virality
                    blended = min(
                        1.0,
                        0.60 * base_confidence
                        + 0.25 * m["engagement_rate"]
                        + 0.15 * m["predicted_virality"],
                    )

                    await http.patch(
                        f"{base_url}/rest/v1/stories",
                        headers={**headers, "Prefer": "return=minimal"},
                        params={"id": f"eq.{m['story_id']}"},
                        json={
                            "sim_engagement_rate": m["engagement_rate"],
                            "sim_predicted_virality": m["predicted_virality"],
                            "sim_polarization_flag": result["polarization_index"] > 0.5,
                            "confidence_score": round(blended, 4),
                        },
                    )

    except Exception as e:
        # Mark run as failed
        for temp_id, run_data in list(_runs.items()):
            if run_data["status"] == "pending":
                _runs[temp_id]["status"] = "failed"
                _runs[temp_id]["error_message"] = str(e)
                break


async def _fetch_run_from_supabase(run_id: str) -> dict | None:
    """Fetch a simulation run and its metrics from Supabase."""
    headers = {
        "apikey": settings.supabase_service_role_key,
        "Authorization": f"Bearer {settings.supabase_service_role_key}",
    }
    base_url = settings.supabase_url

    async with httpx.AsyncClient(timeout=15) as http:
        run_resp = await http.get(
            f"{base_url}/rest/v1/simulation_runs",
            headers=headers,
            params={"run_id": f"eq.{run_id}", "limit": "1"},
        )
        if run_resp.status_code != 200 or not run_resp.json():
            return None

        run = run_resp.json()[0]

        metrics_resp = await http.get(
            f"{base_url}/rest/v1/simulation_metrics",
            headers=headers,
            params={"run_id": f"eq.{run['id']}"},
        )
        metrics = metrics_resp.json() if metrics_resp.status_code == 200 else []

    return {
        "run_id": run["run_id"],
        "status": run["status"],
        "agent_count": run["agent_count"],
        "simulation_steps": run["simulation_steps"],
        "story_count": run["story_count"],
        "total_actions": run.get("total_actions", 0),
        "polarization_index": float(run.get("polarization_index", 0) or 0),
        "echo_chamber_score": float(run.get("echo_chamber_score", 0) or 0),
        "duration_seconds": float(run.get("duration_seconds", 0) or 0),
        "metrics": [
            {
                "story_id": m["story_id"],
                "engagement_rate": float(m["engagement_rate"]),
                "sentiment_ratio": float(m["sentiment_ratio"]),
                "share_velocity": float(m["share_velocity"]),
                "predicted_virality": float(m["predicted_virality"]),
                "like_count": m.get("like_count", 0),
                "dislike_count": m.get("dislike_count", 0),
                "share_count": m.get("share_count", 0),
                "comment_count": m.get("comment_count", 0),
                "propagation_depth": m.get("propagation_depth", 0),
            }
            for m in metrics
        ],
    }
