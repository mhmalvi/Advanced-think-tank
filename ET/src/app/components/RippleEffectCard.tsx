/**
 * RippleEffectCard — floating card showing cross-domain connections.
 *
 * Surfaces related stories from different topics using semantic search.
 * Shows on the right margin of story content in canvas view.
 * "Dismiss" removes it; "Explore" sends topic to chat.
 */

import { useState, useEffect } from "react";
import { X, ArrowRight, Zap, Loader2 } from "lucide-react";
import { LabelPill } from "./StoryLabel";

interface RippleConnection {
  title: string;
  connection_summary: string;
  impact: string;
  source_article_id: string;
  labels: { type: string; text: string; reason: string }[];
  confidence: number;
}

interface RippleEffectCardProps {
  storyId: string;
  storyContent: string;
  storyLabels: { type: string; text: string; reason: string }[];
  onExplore: (topic: string) => void;
}

export function RippleEffectCard({
  storyId,
  storyContent,
  storyLabels,
  onExplore,
}: RippleEffectCardProps) {
  const [connections, setConnections] = useState<RippleConnection[]>([]);
  const [dismissed, setDismissed] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);

  useEffect(() => {
    if (fetched || !storyId || !storyContent) return;
    setLoading(true);

    const webhookBase = import.meta.env.VITE_N8N_WEBHOOK_URL || "/webhook";
    fetch(`${webhookBase}/att-ripple-effects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        story_id: storyId,
        story_content: storyContent.slice(0, 2000),
        story_labels: storyLabels,
      }),
    })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
        const results = Array.isArray(data) ? data : data?.connections || [];
        setConnections(results.filter((c: RippleConnection) => c.confidence > 0.6));
      })
      .catch(() => setConnections([]))
      .finally(() => {
        setLoading(false);
        setFetched(true);
      });
  }, [storyId, storyContent, storyLabels, fetched]);

  const visible = connections.filter((_, i) => !dismissed.has(i));

  if (!loading && visible.length === 0) return null;

  return (
    <div className="space-y-3">
      {loading && (
        <div className="flex items-center gap-2 px-3 py-2 text-[10px] text-stone-400">
          <Loader2 className="size-3 animate-spin" />
          Checking for cross-domain connections...
        </div>
      )}

      {visible.map((conn, idx) => {
        const realIdx = connections.indexOf(conn);
        return (
          <div
            key={realIdx}
            className="border-l-2 border-amber-400 dark:border-amber-600 rounded-r-lg bg-amber-50/50 dark:bg-amber-950/20 p-3 relative group"
          >
            {/* Dismiss */}
            <button
              onClick={() => setDismissed((s) => new Set(s).add(realIdx))}
              className="absolute top-2 right-2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-amber-100 dark:hover:bg-amber-900/30 text-stone-400 transition-all"
            >
              <X className="size-3" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-1.5 mb-1.5">
              <Zap className="size-3 text-amber-500" />
              <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                Ripple Effect
              </span>
              <span className="text-[9px] text-stone-400 ml-auto">
                {Math.round(conn.confidence * 100)}% match
              </span>
            </div>

            {/* Title */}
            <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-1">
              {conn.title}
            </h4>

            {/* Summary */}
            <p className="text-[11px] text-stone-600 dark:text-stone-400 leading-relaxed mb-2">
              {conn.connection_summary}
            </p>

            {/* Impact */}
            <p className="text-[10px] text-stone-500 dark:text-stone-500 italic mb-2">
              Watch for: {conn.impact}
            </p>

            {/* Labels */}
            {conn.labels && conn.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {conn.labels.slice(0, 3).map((label, li) => (
                  <LabelPill key={li} label={label as any} />
                ))}
              </div>
            )}

            {/* Explore */}
            <button
              onClick={() => onExplore(conn.title)}
              className="flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors"
            >
              Explore in chat
              <ArrowRight className="size-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
