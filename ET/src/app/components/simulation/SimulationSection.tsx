/**
 * SimulationSection — LeftNav panel showing simulation status and top predicted stories.
 * Appears below the Trending section.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FlaskConical, ArrowRight } from "lucide-react";
import { useSimulationStore } from "@/stores/simulation";
import { useStoriesStore } from "@/stores/stories";
import { Sparkline } from "./Sparkline";

interface SimulationSectionProps {
  collapsed?: boolean;
}

export function SimulationSection({ collapsed = false }: SimulationSectionProps) {
  const latestRun = useSimulationStore((s) => s.latestRun);
  const recentRuns = useSimulationStore((s) => s.recentRuns);
  const metricsByStory = useSimulationStore((s) => s.metricsByStory);
  const healthStatus = useSimulationStore((s) => s.healthStatus);
  const fetchLatest = useSimulationStore((s) => s.fetchLatest);
  const fetchRecentRuns = useSimulationStore((s) => s.fetchRecentRuns);
  const stories = useStoriesStore((s) => s.stories);

  useEffect(() => {
    fetchLatest();
    fetchRecentRuns();
  }, [fetchLatest, fetchRecentRuns]);

  // Collapsed: just the icon with a pulse dot
  if (collapsed) {
    return (
      <Link
        to="/simulation"
        className="relative p-2 rounded text-stone-500 hover:text-[#E30613] dark:hover:text-[#ff4444] hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        title="Simulation Intelligence"
      >
        <FlaskConical className="size-4" />
        {latestRun && (
          <span className="absolute top-1 right-1 size-1.5 rounded-full bg-purple-500 animate-pulse" />
        )}
      </Link>
    );
  }

  // Get top stories sorted by predicted virality
  const topStories = stories
    .filter((s) => metricsByStory[s.id])
    .sort(
      (a, b) =>
        (metricsByStory[b.id]?.predicted_virality ?? 0) -
        (metricsByStory[a.id]?.predicted_virality ?? 0),
    )
    .slice(0, 4);

  const sparklineData = recentRuns
    .slice()
    .reverse()
    .map((r) => r.total_actions);

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-1 mb-1.5 text-stone-900 dark:text-stone-100">
        <FlaskConical className="size-3.5" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider">
          Simulation
        </h2>
      </div>

      {/* Status card */}
      {latestRun && (
        <div className="mx-1 mb-2 p-2 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5">
              <span
                className={`size-1.5 rounded-full ${
                  healthStatus === "green"
                    ? "bg-green-500"
                    : healthStatus === "amber"
                      ? "bg-amber-500"
                      : healthStatus === "red"
                        ? "bg-red-500"
                        : "bg-stone-400"
                }`}
              />
              <span className="text-[10px] font-medium text-stone-700 dark:text-stone-300">
                Active
              </span>
            </div>
            <span className="text-[10px] text-stone-400">
              {latestRun.agent_count} agents
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-stone-500">
            <span>Polarization: {latestRun.polarization_index.toFixed(2)}</span>
            {sparklineData.length > 1 && (
              <Sparkline data={sparklineData} height={16} width={48} />
            )}
          </div>
        </div>
      )}

      {/* Top predicted impact */}
      {topStories.length > 0 && (
        <>
          <p className="px-2 text-[10px] text-stone-400 dark:text-stone-500 mb-1">
            Top Predicted Impact:
          </p>
          <ul className="space-y-0.5">
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

              return (
                <li key={story.id}>
                  <Link
                    to={`/canvas/${story.id}`}
                    className="w-full text-left px-2 py-1 text-xs text-stone-600 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-800 rounded flex items-center gap-2 transition-colors"
                  >
                    <span className={`text-[10px] font-bold ${color} shrink-0 w-8 text-right`}>
                      {pct}%
                    </span>
                    <span className="line-clamp-1 flex-1">{story.title}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Link to simulation dashboard */}
      <Link
        to="/simulation"
        className="flex items-center gap-1 px-2 py-1.5 mt-1 text-[10px] text-stone-500 dark:text-stone-400 hover:text-[#E30613] dark:hover:text-[#ff4444] transition-colors"
      >
        <span>Simulation Dashboard</span>
        <ArrowRight className="size-3" />
      </Link>
    </div>
  );
}
