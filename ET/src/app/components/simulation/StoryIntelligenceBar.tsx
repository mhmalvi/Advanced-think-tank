/**
 * StoryIntelligenceBar — collapsible bar at top of story panel showing
 * simulation engagement, archetype breakdown, entity map link, and what-if.
 */

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useSimulationStore } from "@/stores/simulation";
import { PropagationCard } from "./PropagationCard";
import { WhatIfCard } from "./WhatIfCard";

interface StoryIntelligenceBarProps {
  storyId: string;
}

export function StoryIntelligenceBar({ storyId }: StoryIntelligenceBarProps) {
  const [expanded, setExpanded] = useState(false);
  const getStoryMetric = useSimulationStore((s) => s.getStoryMetric);
  const metric = getStoryMetric(storyId);

  if (!metric) {
    return (
      <div className="px-4 py-2 bg-stone-50 dark:bg-stone-900/30 border-b border-stone-200 dark:border-stone-800 text-[10px] text-stone-400">
        No simulation data for this story
      </div>
    );
  }

  const engPct = Math.round(metric.engagement_rate * 100);
  const sentLabel =
    metric.sentiment_ratio > 0.6
      ? "positive"
      : metric.sentiment_ratio < 0.4
        ? "negative"
        : "neutral";

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/30">
      {/* Collapsed summary bar */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
      >
        <div className="flex items-center gap-3 text-xs">
          <span
            className={`size-2 rounded-full ${
              engPct >= 60
                ? "bg-green-500"
                : engPct >= 35
                  ? "bg-amber-500"
                  : "bg-red-500"
            }`}
          />
          <span className="font-medium text-stone-700 dark:text-stone-300">
            {engPct}% engagement
          </span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-500">{metric.sentiment_ratio.toFixed(2)} {sentLabel}</span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-500">{metric.share_count} shares</span>
          <span className="text-stone-400">·</span>
          <span className="text-stone-500">50 agents</span>
        </div>
        {expanded ? (
          <ChevronUp className="size-4 text-stone-400" />
        ) : (
          <ChevronDown className="size-4 text-stone-400" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-4 pb-3 space-y-3">
          <div className="grid grid-cols-4 gap-3 text-center text-[10px]">
            <div className="p-2 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
              <p className="font-bold text-lg text-stone-900 dark:text-white">{metric.like_count}</p>
              <p className="text-stone-400">Likes</p>
            </div>
            <div className="p-2 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
              <p className="font-bold text-lg text-stone-900 dark:text-white">{metric.dislike_count}</p>
              <p className="text-stone-400">Dislikes</p>
            </div>
            <div className="p-2 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
              <p className="font-bold text-lg text-stone-900 dark:text-white">{metric.share_count}</p>
              <p className="text-stone-400">Shares</p>
            </div>
            <div className="p-2 rounded bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700">
              <p className="font-bold text-lg text-stone-900 dark:text-white">{metric.comment_count}</p>
              <p className="text-stone-400">Comments</p>
            </div>
          </div>

          <PropagationCard />
          <WhatIfCard storyId={storyId} />
        </div>
      )}
    </div>
  );
}
