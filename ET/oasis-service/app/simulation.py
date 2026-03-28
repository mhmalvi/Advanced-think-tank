"""OASIS simulation wrapper.

Runs a social media simulation with agent archetypes reacting to stories.
Uses Claude Haiku to generate agent responses, then extracts engagement metrics.
"""

from __future__ import annotations

import hashlib
import json
import random
import time
import uuid
from pathlib import Path

import anthropic

from app.agent_profiles import build_agent_pool, ARCHETYPES
from app.config import settings
from app.models import StoryMetric


AGENT_PROMPT = """You are a {archetype} persona on a social media platform focused on geopolitical intelligence.

Your profile: {description}

You are reading a story with the following content:

Title: {title}
Content: {content}

Based on your persona, respond with a JSON object containing your reactions:
{{
  "action": "like" | "dislike" | "share" | "comment" | "ignore",
  "sentiment": a float from -1.0 (very negative) to 1.0 (very positive),
  "engagement_depth": a float from 0.0 (glanced) to 1.0 (deep read),
  "would_share": true | false,
  "comment_text": "your brief comment if action is comment, else null",
  "reasoning": "one sentence explaining your reaction"
}}

Respond ONLY with the JSON object, no other text."""


async def run_simulation(
    stories: list[dict],
    agent_count: int = 50,
    simulation_steps: int = 3,
) -> dict:
    """Run a social simulation on the given stories.

    Args:
        stories: List of story dicts with id, title, synthetic_content.
        agent_count: Number of agents to simulate.
        simulation_steps: Number of interaction rounds.

    Returns:
        Dict with run metadata and per-story metrics.
    """
    run_id = str(uuid.uuid4())
    start_time = time.time()
    agents = build_agent_pool(agent_count)
    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

    all_actions = []
    story_metrics: list[StoryMetric] = []

    for story in stories:
        story_id = story["id"]
        title = story.get("title", "Untitled")
        content = story.get("synthetic_content", story.get("synopsis", ""))
        if not content:
            continue

        # Truncate content to control token usage
        content = content[:1500]

        likes = 0
        dislikes = 0
        shares = 0
        comments = 0
        sentiments = []
        engagement_depths = []
        share_chain_depth = 0

        # Each step simulates a wave of agent interactions.
        # Use Claude for 1 representative agent per archetype per story (6 calls),
        # then apply probabilistic modeling for the remaining agents to keep
        # the simulation fast (~30s) while still data-rich.
        llm_reactions: dict[str, dict] = {}  # archetype -> LLM reaction template

        for step in range(simulation_steps):
            step_agents = random.sample(
                agents, min(len(agents), max(5, agent_count // simulation_steps))
            )

            for agent in step_agents:
                archetype = agent["archetype"]

                # Only call Claude once per archetype per story (on step 0)
                if step == 0 and archetype not in llm_reactions:
                    prompt = AGENT_PROMPT.format(
                        archetype=archetype,
                        description=agent["description"],
                        title=title,
                        content=content,
                    )
                    try:
                        response = client.messages.create(
                            model=settings.llm_model,
                            max_tokens=256,
                            messages=[{"role": "user", "content": prompt}],
                        )
                        raw = response.content[0].text.strip()
                        if raw.startswith("```"):
                            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0].strip()
                        llm_reactions[archetype] = json.loads(raw)
                    except (json.JSONDecodeError, IndexError, anthropic.APIError):
                        llm_reactions[archetype] = _fallback_reaction(agent, title)

                # Use LLM template for this archetype, add per-agent variance
                if archetype in llm_reactions:
                    template = llm_reactions[archetype]
                    reaction = _vary_reaction(template, agent, title, step)
                else:
                    reaction = _fallback_reaction(agent, title)

                action = reaction.get("action", "ignore")
                sentiment = float(reaction.get("sentiment", 0.0))
                depth = float(reaction.get("engagement_depth", 0.3))
                would_share = reaction.get("would_share", False)

                sentiments.append(sentiment)
                engagement_depths.append(depth)

                if action == "like":
                    likes += 1
                elif action == "dislike":
                    dislikes += 1
                elif action == "share":
                    shares += 1
                    share_chain_depth = max(share_chain_depth, step + 1)
                elif action == "comment":
                    comments += 1

                if would_share and action != "share":
                    shares += 1
                    share_chain_depth = max(share_chain_depth, step + 1)

                all_actions.append({
                    "agent_id": agent["id"],
                    "archetype": agent["archetype"],
                    "story_id": story_id,
                    "step": step,
                    "action": action,
                    "sentiment": sentiment,
                    "engagement_depth": depth,
                    "would_share": would_share,
                    "comment_text": reaction.get("comment_text"),
                    "reasoning": reaction.get("reasoning"),
                })

        total_interactions = likes + dislikes + shares + comments
        total_exposed = agent_count * simulation_steps
        engagement_rate = min(1.0, total_interactions / max(1, total_exposed))

        avg_sentiment = sum(sentiments) / max(1, len(sentiments))
        sentiment_ratio = (avg_sentiment + 1.0) / 2.0  # Normalize to 0-1

        share_velocity = shares / max(1, simulation_steps)
        predicted_virality = min(1.0, (
            engagement_rate * 0.3
            + (shares / max(1, total_exposed)) * 0.4
            + sentiment_ratio * 0.2
            + (share_chain_depth / max(1, simulation_steps)) * 0.1
        ))

        story_metrics.append(StoryMetric(
            story_id=story_id,
            engagement_rate=round(engagement_rate, 4),
            sentiment_ratio=round(sentiment_ratio, 4),
            share_velocity=round(share_velocity, 4),
            predicted_virality=round(predicted_virality, 4),
            like_count=likes,
            dislike_count=dislikes,
            share_count=shares,
            comment_count=comments,
            propagation_depth=share_chain_depth,
        ))

    duration = time.time() - start_time

    # Calculate global polarization (variance of sentiment across all actions)
    all_sentiments = [a["sentiment"] for a in all_actions]
    if len(all_sentiments) > 1:
        mean_s = sum(all_sentiments) / len(all_sentiments)
        variance = sum((s - mean_s) ** 2 for s in all_sentiments) / len(all_sentiments)
        polarization_index = min(1.0, variance)
    else:
        polarization_index = 0.0

    # Echo chamber: how clustered are sentiments by archetype?
    archetype_means = {}
    for a in all_actions:
        archetype = a["agent_id"].rsplit("_", 1)[0].capitalize()
        archetype_means.setdefault(archetype, []).append(a["sentiment"])
    archetype_means = {
        k: sum(v) / len(v) for k, v in archetype_means.items() if v
    }
    if len(archetype_means) > 1:
        global_mean = sum(archetype_means.values()) / len(archetype_means)
        echo_var = sum(
            (m - global_mean) ** 2 for m in archetype_means.values()
        ) / len(archetype_means)
        echo_chamber_score = min(1.0, echo_var * 4)  # Scale up for sensitivity
    else:
        echo_chamber_score = 0.0

    return {
        "run_id": run_id,
        "status": "completed",
        "agent_count": agent_count,
        "simulation_steps": simulation_steps,
        "story_count": len(stories),
        "total_actions": len(all_actions),
        "polarization_index": round(polarization_index, 4),
        "echo_chamber_score": round(echo_chamber_score, 4),
        "duration_seconds": round(duration, 2),
        "metrics": [m.model_dump() for m in story_metrics],
        "actions": all_actions,
    }


def _vary_reaction(template: dict, agent: dict, title: str, step: int) -> dict:
    """Add per-agent variance to an LLM-generated reaction template.

    Keeps the archetype's overall sentiment direction but varies
    the specific action and engagement depth per agent.
    """
    seed = int(hashlib.md5(
        f"{agent['id']}{title}{step}".encode()
    ).hexdigest()[:8], 16)
    rng = random.Random(seed)

    base_sentiment = float(template.get("sentiment", 0.0))
    sentiment = max(-1.0, min(1.0,
        base_sentiment + rng.uniform(-0.3, 0.3) * agent["sentiment_weight"]
    ))

    base_depth = float(template.get("engagement_depth", 0.5))
    depth = max(0.0, min(1.0,
        base_depth + rng.uniform(-0.2, 0.2)
    ))

    # Vary action based on engagement bias
    roll = rng.random()
    base_action = template.get("action", "ignore")
    if roll > agent["engagement_bias"]:
        action = "ignore"
    elif base_action in ("like", "share", "comment"):
        # Mostly follow the template, occasionally vary
        if rng.random() < 0.7:
            action = base_action
        else:
            action = rng.choice(["like", "comment", "share"])
    else:
        action = base_action

    would_share = template.get("would_share", False)
    if rng.random() < agent["share_threshold"]:
        would_share = True

    return {
        "action": action,
        "sentiment": round(sentiment, 2),
        "engagement_depth": round(depth, 2),
        "would_share": would_share,
        "comment_text": None,
        "reasoning": "varied from archetype template",
    }


def _fallback_reaction(agent: dict, title: str) -> dict:
    """Generate a probabilistic reaction when LLM call fails.

    Uses the agent's engagement bias and share threshold to produce
    a deterministic-ish fallback based on the title hash.
    """
    seed = int(hashlib.md5(
        f"{agent['id']}{title}".encode()
    ).hexdigest()[:8], 16)
    rng = random.Random(seed)

    engagement = rng.random()
    if engagement < agent["engagement_bias"]:
        if rng.random() < agent["share_threshold"]:
            action = "share"
        elif rng.random() < 0.6:
            action = "like"
        else:
            action = "comment"
    else:
        action = "ignore"

    sentiment = rng.uniform(-0.3, 0.8) * agent["sentiment_weight"]

    return {
        "action": action,
        "sentiment": round(sentiment, 2),
        "engagement_depth": round(rng.random() * agent["engagement_bias"], 2),
        "would_share": rng.random() < agent["share_threshold"],
        "comment_text": None,
        "reasoning": "fallback reaction",
    }
