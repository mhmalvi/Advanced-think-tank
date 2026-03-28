/**
 * SimulationPulse — RightSidebar bottom section showing sparkline trend
 * of engagement from the last 7 simulation runs.
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { FlaskConical } from "lucide-react";
import { useSimulationStore } from "@/stores/simulation";
import { Sparkline } from "./Sparkline";

export function SimulationPulse() {
  const latestRun = useSimulationStore((s) => s.latestRun);
  const recentRuns = useSimulationStore((s) => s.recentRuns);
  const fetchLatest = useSimulationStore((s) => s.fetchLatest);
  const fetchRecentRuns = useSimulationStore((s) => s.fetchRecentRuns);

  useEffect(() => {
    fetchLatest();
    fetchRecentRuns();
  }, [fetchLatest, fetchRecentRuns]);

  if (!latestRun) return null;

  const engagementTrend = recentRuns
    .slice()
    .reverse()
    .map((r) => r.total_actions);

  const timeAgo = latestRun.completed_at
    ? _timeAgo(latestRun.completed_at)
    : "unknown";

  return (
    <div className="p-2.5 bg-white dark:bg-stone-950 rounded border border-stone-200 dark:border-stone-700">
      <div className="flex items-center gap-1.5 mb-2">
        <FlaskConical className="size-3.5 text-stone-700 dark:text-stone-300" />
        <h3 className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wide">
          Simulation Pulse
        </h3>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-stone-600 dark:text-stone-400">
            Last sim: {timeAgo}
          </span>
        </div>

        {engagementTrend.length > 1 && (
          <Sparkline data={engagementTrend} height={24} />
        )}

        <div className="flex items-center justify-between text-[10px] text-stone-500">
          <span>
            {latestRun.agent_count} agents · {latestRun.total_actions} actions
          </span>
        </div>

        <Link
          to="/simulation"
          className="block text-center text-[10px] font-medium text-[#E30613] hover:text-[#ff4444] transition-colors mt-1"
        >
          View Full →
        </Link>
      </div>
    </div>
  );
}

function _timeAgo(dateStr: string): string {
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
