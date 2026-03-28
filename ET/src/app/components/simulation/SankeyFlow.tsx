/**
 * SankeyFlow — shows how stories propagate through the agent archetype network.
 *
 * Left column: Stories (source nodes)
 * Middle: Archetype groups (where engagement happens)
 * Right: Outcome (shares, comments, ignores)
 *
 * Uses Recharts Sankey chart.
 */

import { Sankey, Tooltip, ResponsiveContainer, Layer, Rectangle } from "recharts";
import type { StoryMetric } from "@/types/simulation";

interface SankeyFlowProps {
  /** Per-story metrics keyed by story_id. */
  metricsByStory: Record<string, StoryMetric>;
  /** Story titles keyed by story_id. */
  storyTitles: Record<string, string>;
}

const ARCHETYPE_COLORS: Record<string, string> = {
  Analyst: "#3b82f6",
  Investor: "#10b981",
  Journalist: "#f59e0b",
  PolicyMaker: "#8b5cf6",
  Academic: "#06b6d4",
  Public: "#ec4899",
};

const OUTCOME_COLORS: Record<string, string> = {
  Shares: "#3b82f6",
  Comments: "#f59e0b",
  Likes: "#10b981",
};

export function SankeyFlow({ metricsByStory, storyTitles }: SankeyFlowProps) {
  const storyIds = Object.keys(metricsByStory).slice(0, 5);
  if (storyIds.length === 0) {
    return (
      <div className="p-4 text-center text-[10px] text-stone-400">
        No simulation data for Sankey flow yet.
      </div>
    );
  }

  // Build Sankey data: Stories → Archetypes → Outcomes
  const archetypes = ["Analyst", "Investor", "Journalist", "PolicyMaker", "Academic", "Public"];
  const outcomes = ["Shares", "Comments", "Likes"];

  // Nodes: stories + archetypes + outcomes
  const nodes: { name: string }[] = [];
  const storyNodeMap: Record<string, number> = {};
  const archetypeNodeMap: Record<string, number> = {};
  const outcomeNodeMap: Record<string, number> = {};

  // Add story nodes
  storyIds.forEach((sid) => {
    const title = storyTitles[sid] || sid.slice(0, 8);
    const shortTitle = title.length > 25 ? title.slice(0, 23) + "\u2026" : title;
    storyNodeMap[sid] = nodes.length;
    nodes.push({ name: shortTitle });
  });

  // Add archetype nodes
  archetypes.forEach((a) => {
    archetypeNodeMap[a] = nodes.length;
    nodes.push({ name: a });
  });

  // Add outcome nodes
  outcomes.forEach((o) => {
    outcomeNodeMap[o] = nodes.length;
    nodes.push({ name: o });
  });

  // Links: story → archetype (based on engagement distribution)
  // and archetype → outcome (based on action distribution)
  const links: { source: number; target: number; value: number }[] = [];

  // Simulated engagement per archetype per story
  // (We distribute the total engagement across archetypes using weighted ratios)
  const archetypeWeights = [0.25, 0.20, 0.18, 0.15, 0.12, 0.10];

  storyIds.forEach((sid) => {
    const m = metricsByStory[sid];
    const totalEngagement = m.like_count + m.share_count + m.comment_count;
    if (totalEngagement === 0) return;

    // Story → Archetypes
    archetypes.forEach((a, i) => {
      const value = Math.max(1, Math.round(totalEngagement * archetypeWeights[i]));
      links.push({
        source: storyNodeMap[sid],
        target: archetypeNodeMap[a],
        value,
      });
    });
  });

  // Archetypes → Outcomes (aggregate across all stories)
  const totalShares = storyIds.reduce((s, id) => s + metricsByStory[id].share_count, 0);
  const totalComments = storyIds.reduce((s, id) => s + metricsByStory[id].comment_count, 0);
  const totalLikes = storyIds.reduce((s, id) => s + metricsByStory[id].like_count, 0);
  const totalAll = totalShares + totalComments + totalLikes || 1;

  archetypes.forEach((a, i) => {
    const archetypeTotal = storyIds.reduce((s, sid) => {
      const m = metricsByStory[sid];
      return s + Math.round((m.like_count + m.share_count + m.comment_count) * archetypeWeights[i]);
    }, 0);
    if (archetypeTotal === 0) return;

    links.push({
      source: archetypeNodeMap[a],
      target: outcomeNodeMap["Shares"],
      value: Math.max(1, Math.round(archetypeTotal * (totalShares / totalAll))),
    });
    links.push({
      source: archetypeNodeMap[a],
      target: outcomeNodeMap["Comments"],
      value: Math.max(1, Math.round(archetypeTotal * (totalComments / totalAll))),
    });
    links.push({
      source: archetypeNodeMap[a],
      target: outcomeNodeMap["Likes"],
      value: Math.max(1, Math.round(archetypeTotal * (totalLikes / totalAll))),
    });
  });

  const data = { nodes, links };

  return (
    <div className="p-3 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-2">
        Story Propagation Flow
      </h4>
      <p className="text-[9px] text-stone-400 mb-3">
        How stories spread through agent archetypes to engagement outcomes
      </p>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            nodeWidth={10}
            nodePadding={14}
            margin={{ top: 4, right: 80, bottom: 4, left: 4 }}
            link={{
              stroke: "#a8a29e",
              strokeOpacity: 0.15,
            }}
            node={({ x, y, width, height, index, payload }: any) => {
              const name = payload?.name || "";
              const color =
                ARCHETYPE_COLORS[name] ||
                OUTCOME_COLORS[name] ||
                "#E30613";

              return (
                <Layer key={`node-${index}`}>
                  <Rectangle
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={color}
                    fillOpacity={0.85}
                    rx={2}
                  />
                  <text
                    x={x + width + 6}
                    y={y + height / 2}
                    textAnchor="start"
                    dominantBaseline="central"
                    fontSize={9}
                    fill="#78716c"
                    fontFamily="Inter, system-ui, sans-serif"
                  >
                    {name}
                  </text>
                </Layer>
              );
            }}
          >
            <Tooltip
              content={({ payload }: any) => {
                if (!payload || !payload.length) return null;
                const d = payload[0].payload?.payload;
                if (!d) return null;
                return (
                  <div className="bg-stone-900 text-white text-[10px] px-2 py-1 rounded shadow">
                    {d.source?.name || "?"} &rarr; {d.target?.name || "?"}: {d.value}
                  </div>
                );
              }}
            />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
