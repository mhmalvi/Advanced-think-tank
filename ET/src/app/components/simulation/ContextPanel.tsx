/**
 * ContextPanel — slide-up panel that appears when a node is clicked in the graph.
 * Shows entity info, engagement metrics, propagation breakdown, and what-if input.
 */

import { X, AlertTriangle } from "lucide-react";
import { EngagementCard } from "./EngagementCard";
import { PropagationCard } from "./PropagationCard";
import { WhatIfCard } from "./WhatIfCard";
import { PolarizationGauge } from "./PolarizationGauge";
import { Heatmap } from "./Heatmap";
import type { Entity, StoryMetric } from "@/types/simulation";

interface ContextPanelProps {
  entity: Entity | null;
  /** Metrics for stories related to this entity. */
  relatedMetrics: StoryMetric[];
  /** Overall polarization index. */
  polarizationIndex: number;
  /** Close the panel. */
  onClose: () => void;
}

export function ContextPanel({
  entity,
  relatedMetrics,
  polarizationIndex,
  onClose,
}: ContextPanelProps) {
  if (!entity) return null;

  // Aggregate metrics across related stories
  const aggregatedMetric: StoryMetric | null =
    relatedMetrics.length > 0
      ? {
          story_id: "aggregate",
          engagement_rate:
            relatedMetrics.reduce((s, m) => s + m.engagement_rate, 0) /
            relatedMetrics.length,
          sentiment_ratio:
            relatedMetrics.reduce((s, m) => s + m.sentiment_ratio, 0) /
            relatedMetrics.length,
          share_velocity:
            relatedMetrics.reduce((s, m) => s + m.share_velocity, 0) /
            relatedMetrics.length,
          predicted_virality:
            relatedMetrics.reduce((s, m) => s + m.predicted_virality, 0) /
            relatedMetrics.length,
          like_count: relatedMetrics.reduce((s, m) => s + m.like_count, 0),
          dislike_count: relatedMetrics.reduce((s, m) => s + m.dislike_count, 0),
          share_count: relatedMetrics.reduce((s, m) => s + m.share_count, 0),
          comment_count: relatedMetrics.reduce((s, m) => s + m.comment_count, 0),
          propagation_depth: Math.max(
            ...relatedMetrics.map((m) => m.propagation_depth),
          ),
        }
      : null;

  const typeLabel = entity.entity_type.charAt(0).toUpperCase() + entity.entity_type.slice(1);

  return (
    <div className="border-t border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0a0a0b] overflow-y-auto max-h-[50vh] animate-in slide-in-from-bottom duration-200">
      {/* Drag handle */}
      <div className="flex justify-center py-1">
        <div className="w-8 h-1 rounded-full bg-stone-300 dark:bg-stone-600" />
      </div>

      <div className="px-6 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">
              {entity.name}
            </h3>
            <p className="text-[10px] text-stone-400 mt-0.5">
              {typeLabel} · Mentioned in {entity.mention_count} article
              {entity.mention_count !== 1 ? "s" : ""}
              {relatedMetrics.length > 0 &&
                ` · ${relatedMetrics.length} stor${relatedMetrics.length !== 1 ? "ies" : "y"}`}
            </p>
            {entity.description && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                {entity.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-400 transition-colors"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {aggregatedMetric ? (
            <>
              <EngagementCard metric={aggregatedMetric} />
              <PropagationCard />
              <div className="space-y-3">
                <div className="p-3 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 flex flex-col items-center">
                  <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-1 self-start">
                    Polarization
                  </h4>
                  <PolarizationGauge value={polarizationIndex} size={100} />
                </div>
                {polarizationIndex > 0.5 && (
                  <div className="p-2.5 rounded border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 flex items-start gap-2">
                    <AlertTriangle className="size-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-amber-700 dark:text-amber-300">
                      Echo chamber risk detected. Agent groups are forming isolated opinion clusters around this entity.
                    </p>
                  </div>
                )}
                <WhatIfCard entityIds={[entity.id]} />
              </div>
              <div className="col-span-3">
                <Heatmap />
              </div>
            </>
          ) : (
            <div className="col-span-3">
              <WhatIfCard entityIds={[entity.id]} />
              <p className="text-[10px] text-stone-400 mt-2 text-center">
                No simulation metrics for this entity's stories yet.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
