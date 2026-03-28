/**
 * MetricStrip — top bar on the simulation canvas showing key metrics with sparklines.
 */

import { FlaskConical, FileText } from "lucide-react";
import { Sparkline } from "./Sparkline";
import type { SimulationRun } from "@/types/simulation";
import type { SimHealthStatus } from "@/types/simulation";

interface MetricStripProps {
  latestRun: SimulationRun | null;
  recentRuns: SimulationRun[];
  healthStatus: SimHealthStatus;
  loading: boolean;
  reportLoading: boolean;
  onTriggerSimulation: () => void;
  onGenerateReport: () => void;
}

const STATUS_COLORS = {
  green: "bg-green-500",
  amber: "bg-amber-500",
  red: "bg-red-500",
  unknown: "bg-stone-400",
};

export function MetricStrip({
  latestRun,
  recentRuns,
  healthStatus,
  loading,
  reportLoading,
  onTriggerSimulation,
  onGenerateReport,
}: MetricStripProps) {
  const engagementTrend = recentRuns
    .slice()
    .reverse()
    .map((r) => r.total_actions);

  const polarizationTrend = recentRuns
    .slice()
    .reverse()
    .map((r) => r.polarization_index);

  const echoTrend = recentRuns
    .slice()
    .reverse()
    .map((r) => r.echo_chamber_score);

  const timeAgo = latestRun?.completed_at
    ? _timeAgo(latestRun.completed_at)
    : "never";

  return (
    <div className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 px-6 py-3 shrink-0">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          {/* Status */}
          <div className="flex items-center gap-2">
            <span className={`size-2 rounded-full ${STATUS_COLORS[healthStatus]}`} />
            <FlaskConical className="size-4 text-stone-700 dark:text-stone-300" />
            <span className="text-xs font-bold text-stone-900 dark:text-white">
              {latestRun ? `${latestRun.agent_count} agents` : "No data"}
            </span>
            <span className="text-[10px] text-stone-400">{timeAgo}</span>
          </div>

          {latestRun && (
            <>
              {/* Actions */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide">Actions</p>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">
                    {latestRun.total_actions.toLocaleString()}
                  </p>
                </div>
                {engagementTrend.length > 1 && (
                  <Sparkline data={engagementTrend} height={20} width={56} />
                )}
              </div>

              {/* Polarization */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide">Polarization</p>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">
                    {latestRun.polarization_index.toFixed(2)}
                  </p>
                </div>
                {polarizationTrend.length > 1 && (
                  <Sparkline data={polarizationTrend} height={20} width={56} color="#f59e0b" />
                )}
              </div>

              {/* Echo Chamber */}
              <div className="flex items-center gap-2">
                <div className="text-center">
                  <p className="text-[10px] text-stone-400 uppercase tracking-wide">Echo</p>
                  <p className="text-xs font-bold text-stone-900 dark:text-white">
                    {latestRun.echo_chamber_score.toFixed(2)}
                  </p>
                </div>
                {echoTrend.length > 1 && (
                  <Sparkline data={echoTrend} height={20} width={56} color="#8b5cf6" />
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center gap-2">
          {latestRun && (
            <button
              onClick={onGenerateReport}
              disabled={reportLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
            >
              <FileText className="size-3.5" />
              {reportLoading ? "Generating..." : "Report"}
            </button>
          )}
          <button
            onClick={onTriggerSimulation}
            disabled={loading}
            className="px-3 py-1.5 text-xs font-medium bg-[#E30613] text-white rounded hover:bg-[#c00510] transition-colors disabled:opacity-50"
          >
            {loading ? "Running..." : "Run Simulation"}
          </button>
        </div>
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
