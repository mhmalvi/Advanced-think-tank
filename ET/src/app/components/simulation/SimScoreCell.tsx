/**
 * SimScoreCell — table cell for the SourcesPage showing sim score with colored dot.
 */

import { useSimulationStore } from "@/stores/simulation";

interface SimScoreCellProps {
  /** Article's parent story ID (if known). */
  storyId?: string | null;
}

export function SimScoreCell({ storyId }: SimScoreCellProps) {
  const metricsByStory = useSimulationStore((s) => s.metricsByStory);

  if (!storyId || !metricsByStory[storyId]) {
    return (
      <span className="text-[10px] text-stone-300 dark:text-stone-600">——</span>
    );
  }

  const metric = metricsByStory[storyId];
  const score = metric.predicted_virality;
  const color =
    score >= 0.6
      ? "bg-green-500"
      : score >= 0.35
        ? "bg-amber-500"
        : "bg-red-500";

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`size-1.5 rounded-full ${color}`} />
      <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
        {score.toFixed(2)}
      </span>
    </span>
  );
}
