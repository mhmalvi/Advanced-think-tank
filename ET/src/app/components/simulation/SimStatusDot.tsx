/**
 * SimStatusDot — 6px colored dot in the TopBar showing simulation health.
 *
 * Green: last run < 4h, polarization < 0.5
 * Amber: last run < 8h, or polarization 0.5-0.75
 * Red: last run > 8h, or echo chamber detected
 */

import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSimulationStore } from "@/stores/simulation";

const STATUS_COLORS = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  unknown: "bg-stone-400",
} as const;

export function SimStatusDot() {
  const healthStatus = useSimulationStore((s) => s.healthStatus);
  const latestRun = useSimulationStore((s) => s.latestRun);
  const fetchLatest = useSimulationStore((s) => s.fetchLatest);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  const tooltipText = latestRun
    ? `Last simulation: ${_timeAgo(latestRun.completed_at)} · ${latestRun.agent_count} agents · ${latestRun.total_actions} actions`
    : "No simulation data";

  return (
    <Link
      to="/simulation"
      className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      title={tooltipText}
    >
      <span
        className={`size-1.5 rounded-full ${STATUS_COLORS[healthStatus]} ${
          healthStatus === "green" ? "animate-pulse" : ""
        }`}
      />
      <span className="text-[10px] font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
        SIM
      </span>
    </Link>
  );
}

function _timeAgo(dateStr?: string): string {
  if (!dateStr) return "never";
  const ms = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ms / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
