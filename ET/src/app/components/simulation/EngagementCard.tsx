/**
 * EngagementCard — shows engagement metrics for a selected entity/story
 * in the ContextPanel. Includes bar chart for archetype breakdown.
 */

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts";
import type { StoryMetric } from "@/types/simulation";

interface EngagementCardProps {
  metric: StoryMetric;
}

export function EngagementCard({ metric }: EngagementCardProps) {
  const engagementPct = Math.round(metric.engagement_rate * 100);

  return (
    <div className="p-3 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-2">
        Engagement
      </h4>

      <div className="grid grid-cols-2 gap-3 mb-3">
        <div>
          <p className="text-2xl font-bold text-stone-900 dark:text-white">
            {engagementPct}%
          </p>
          <p className="text-[10px] text-stone-400">engagement rate</p>
        </div>
        <div>
          <p className="text-2xl font-bold text-stone-900 dark:text-white">
            {metric.sentiment_ratio.toFixed(2)}
          </p>
          <p className="text-[10px] text-stone-400">
            sentiment {metric.sentiment_ratio > 0.6 ? "👍" : metric.sentiment_ratio < 0.4 ? "👎" : "➡️"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2 text-center text-[10px]">
        <div>
          <p className="font-bold text-stone-900 dark:text-white">{metric.like_count}</p>
          <p className="text-stone-400">Likes</p>
        </div>
        <div>
          <p className="font-bold text-stone-900 dark:text-white">{metric.dislike_count}</p>
          <p className="text-stone-400">Dislikes</p>
        </div>
        <div>
          <p className="font-bold text-stone-900 dark:text-white">{metric.share_count}</p>
          <p className="text-stone-400">Shares</p>
        </div>
        <div>
          <p className="font-bold text-stone-900 dark:text-white">{metric.comment_count}</p>
          <p className="text-stone-400">Comments</p>
        </div>
      </div>
    </div>
  );
}
