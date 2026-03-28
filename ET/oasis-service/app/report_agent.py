"""Automated report generation from simulation data."""

from __future__ import annotations

import uuid

import anthropic

from app.config import settings


REPORT_PROMPT = """You are a senior intelligence analyst writing a simulation briefing report.

Based on the following OASIS social simulation results, write a concise intelligence report.

## Simulation Run Summary
- Agents: {agent_count}
- Steps: {simulation_steps}
- Stories analyzed: {story_count}
- Total actions: {total_actions}
- Polarization index: {polarization_index}
- Echo chamber score: {echo_chamber_score}
- Duration: {duration_seconds}s

## Per-Story Metrics
{metrics_text}

Write the report in markdown with these sections:
1. **Executive Summary** (2-3 sentences)
2. **Key Findings** (bullet points)
3. **Polarization Analysis** (1 paragraph)
4. **High-Impact Stories** (top stories by engagement/virality)
5. **Recommendations** (what to watch, what to investigate further)

Be concise, analytical, and actionable. No filler."""


async def generate_report(run_data: dict, fmt: str = "markdown") -> dict:
    """Generate an analysis report from simulation results.

    Args:
        run_data: Full simulation result dict.
        fmt: Output format ('markdown' or 'json').

    Returns:
        Dict with report_id, run_id, content, format.
    """
    metrics = run_data.get("metrics", [])
    metrics_text = "\n".join(
        f"- Story {m['story_id'][:8]}...: "
        f"engagement={m['engagement_rate']}, "
        f"virality={m['predicted_virality']}, "
        f"sentiment={m['sentiment_ratio']}, "
        f"shares={m['share_count']}, "
        f"comments={m['comment_count']}"
        for m in metrics
    )

    prompt = REPORT_PROMPT.format(
        agent_count=run_data.get("agent_count", 0),
        simulation_steps=run_data.get("simulation_steps", 0),
        story_count=run_data.get("story_count", 0),
        total_actions=run_data.get("total_actions", 0),
        polarization_index=run_data.get("polarization_index", 0),
        echo_chamber_score=run_data.get("echo_chamber_score", 0),
        duration_seconds=run_data.get("duration_seconds", 0),
        metrics_text=metrics_text or "No metrics available",
    )

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = client.messages.create(
        model=settings.llm_model,
        max_tokens=2048,
        messages=[{"role": "user", "content": prompt}],
    )

    content = response.content[0].text.strip()

    return {
        "report_id": str(uuid.uuid4()),
        "run_id": run_data.get("run_id", ""),
        "content": content,
        "format": fmt,
    }
