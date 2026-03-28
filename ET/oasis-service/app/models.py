"""Pydantic request/response schemas for the Aether service."""

from __future__ import annotations

from typing import Optional
from pydantic import BaseModel, Field


# ── Simulation ──────────────────────────────────────────────

class SimulateRequest(BaseModel):
    """Request body for POST /simulate."""

    story_ids: list[str] = Field(
        ..., description="List of story UUIDs to simulate"
    )
    agent_count: int = Field(50, ge=2, le=200)
    simulation_steps: int = Field(3, ge=1, le=10)


class SimulateResponse(BaseModel):
    """Immediate response from POST /simulate (async job)."""

    run_id: str
    status: str = "pending"


class StoryMetric(BaseModel):
    """Per-story simulation results."""

    story_id: str
    engagement_rate: float
    sentiment_ratio: float
    share_velocity: float
    predicted_virality: float
    like_count: int = 0
    dislike_count: int = 0
    share_count: int = 0
    comment_count: int = 0
    propagation_depth: int = 0


class SimulationResult(BaseModel):
    """Full result for GET /results/{run_id}."""

    run_id: str
    status: str
    agent_count: int = 0
    simulation_steps: int = 0
    story_count: int = 0
    total_actions: int = 0
    polarization_index: float = 0.0
    echo_chamber_score: float = 0.0
    duration_seconds: float = 0.0
    metrics: list[StoryMetric] = []
    error_message: Optional[str] = None


# ── Knowledge Graph ─────────────────────────────────────────

class GraphBuildRequest(BaseModel):
    """Request body for POST /graph/build."""

    article_ids: list[str] = Field(
        ..., description="Article UUIDs to extract entities from"
    )
    story_id: Optional[str] = None


class Entity(BaseModel):
    """A node in the knowledge graph."""

    id: str
    name: str
    entity_type: str
    description: Optional[str] = None
    mention_count: int = 1


class Relationship(BaseModel):
    """An edge in the knowledge graph."""

    id: str
    source_entity_id: str
    target_entity_id: str
    relationship_type: str
    weight: float = 1.0
    article_count: int = 1


class GraphResponse(BaseModel):
    """Knowledge graph nodes + edges."""

    entities: list[Entity] = []
    relationships: list[Relationship] = []


# ── Prediction ──────────────────────────────────────────────

class PredictRequest(BaseModel):
    """Request body for POST /predict."""

    scenario: str = Field(..., description="What-if scenario text")
    story_id: Optional[str] = None
    entity_ids: list[str] = []


class PredictResponse(BaseModel):
    """What-if prediction result."""

    scenario: str
    analysis: str
    impact_scores: dict[str, float] = {}
    affected_entity_ids: list[str] = []
    confidence: float = 0.0


# ── Report ──────────────────────────────────────────────────

class ReportRequest(BaseModel):
    """Request body for POST /report/generate."""

    run_id: str
    format: str = Field("markdown", pattern="^(markdown|json)$")


class ReportResponse(BaseModel):
    """Generated report."""

    report_id: str
    run_id: str
    content: str
    format: str = "markdown"
