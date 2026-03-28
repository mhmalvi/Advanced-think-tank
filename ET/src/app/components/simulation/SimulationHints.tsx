/**
 * SimulationHints — dropdown section in SearchBar showing top 3 stories
 * ranked by simulation score. Appears above "Recent" when focused + empty query.
 */

import { useNavigate } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { useSimulationStore } from "@/stores/simulation";
import { useStoriesStore } from "@/stores/stories";

interface SimulationHintsProps {
  /** Called after navigating to close the dropdown. */
  onSelect: () => void;
}

export function SimulationHints({ onSelect }: SimulationHintsProps) {
  const metricsByStory = useSimulationStore((s) => s.metricsByStory);
  const stories = useStoriesStore((s) => s.stories);
  const navigate = useNavigate();

  // Top 3 stories by predicted virality that have sim data
  const topStories = stories
    .filter((s) => metricsByStory[s.id])
    .sort(
      (a, b) =>
        (metricsByStory[b.id]?.predicted_virality ?? 0) -
        (metricsByStory[a.id]?.predicted_virality ?? 0),
    )
    .slice(0, 3);

  if (topStories.length === 0) return null;

  return (
    <div className="border-b border-stone-100 dark:border-stone-800">
      <div className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-stone-400 flex items-center gap-1.5">
        <FlaskConical className="size-3" />
        Trending in Simulation
      </div>
      {topStories.map((story) => {
        const metric = metricsByStory[story.id];
        if (!metric) return null;
        const pct = Math.round(metric.predicted_virality * 100);
        const color =
          pct >= 60
            ? "text-green-600"
            : pct >= 35
              ? "text-amber-500"
              : "text-red-500";
        const label =
          pct >= 60
            ? "predicted engagement"
            : metric.sentiment_ratio < 0.4
              ? "low engagement, echo chamber risk"
              : "polarization detected";

        return (
          <button
            key={story.id}
            onClick={() => {
              navigate(`/canvas/${story.id}`);
              onSelect();
            }}
            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors text-left"
          >
            <span className={`text-xs font-bold ${color} shrink-0`}>
              {pct}%
            </span>
            <div className="min-w-0 flex-1">
              <span className="line-clamp-1 text-xs">{story.title}</span>
              <span className="text-[10px] text-stone-400 block">
                {label}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
