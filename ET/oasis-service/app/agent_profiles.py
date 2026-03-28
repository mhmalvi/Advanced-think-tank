"""Six agent archetypes for Aether social simulation.

Each archetype has distinct engagement patterns, biases, and sharing behaviors
that model how different personas interact with geopolitical intelligence.
"""

from __future__ import annotations

ARCHETYPES = [
    {
        "name": "Analyst",
        "description": (
            "Senior intelligence analyst at a think tank. Reads deeply, shares "
            "selectively, focuses on accuracy and sourcing. High engagement with "
            "complex geopolitical narratives. Skeptical of sensationalism."
        ),
        "engagement_bias": 0.85,
        "share_threshold": 0.7,
        "sentiment_weight": 0.3,
        "topics": ["geopolitics", "defense", "policy", "trade"],
    },
    {
        "name": "Investor",
        "description": (
            "Portfolio manager at a macro hedge fund. Scans for market-moving "
            "signals, reacts quickly to trade policy and sanctions. High share "
            "velocity on financial implications. Pragmatic, not ideological."
        ),
        "engagement_bias": 0.75,
        "share_threshold": 0.5,
        "sentiment_weight": 0.6,
        "topics": ["economics", "trade", "finance", "energy", "technology"],
    },
    {
        "name": "Journalist",
        "description": (
            "Foreign correspondent for a major wire service. Amplifies breaking "
            "news, values novelty and exclusivity. High share rate, moderate "
            "depth of engagement. Balances speed with accuracy."
        ),
        "engagement_bias": 0.70,
        "share_threshold": 0.3,
        "sentiment_weight": 0.5,
        "topics": ["geopolitics", "defense", "climate", "infrastructure"],
    },
    {
        "name": "PolicyMaker",
        "description": (
            "EU Commission policy advisor. Engages with regulatory and "
            "compliance implications. Slow to share, high standards for sourcing. "
            "Focuses on institutional impact and precedent."
        ),
        "engagement_bias": 0.65,
        "share_threshold": 0.8,
        "sentiment_weight": 0.2,
        "topics": ["policy", "trade", "climate", "legal", "healthcare"],
    },
    {
        "name": "Academic",
        "description": (
            "Professor of international relations. Deep engagement with "
            "historical context and structural analysis. Shares for educational "
            "value. Critical of oversimplification."
        ),
        "engagement_bias": 0.60,
        "share_threshold": 0.6,
        "sentiment_weight": 0.2,
        "topics": ["geopolitics", "economics", "defense", "policy"],
    },
    {
        "name": "Public",
        "description": (
            "Informed citizen who follows world news casually. Reacts to "
            "headlines, shares emotionally resonant content. Lower engagement "
            "depth but high volume. Susceptible to polarization."
        ),
        "engagement_bias": 0.40,
        "share_threshold": 0.2,
        "sentiment_weight": 0.8,
        "topics": ["economics", "energy", "climate", "technology"],
    },
]


def build_agent_pool(count: int) -> list[dict]:
    """Build a pool of agents distributed across archetypes.

    Args:
        count: Total number of agents to create (2-200).

    Returns:
        List of agent config dicts with archetype properties.
    """
    agents = []
    per_type = max(1, count // len(ARCHETYPES))
    remainder = count - (per_type * len(ARCHETYPES))

    for i, archetype in enumerate(ARCHETYPES):
        n = per_type + (1 if i < remainder else 0)
        for j in range(n):
            agents.append({
                "id": f"{archetype['name'].lower()}_{j}",
                "archetype": archetype["name"],
                "description": archetype["description"],
                "engagement_bias": archetype["engagement_bias"],
                "share_threshold": archetype["share_threshold"],
                "sentiment_weight": archetype["sentiment_weight"],
                "topics": archetype["topics"],
            })

    return agents[:count]
