/**
 * Zustand store for OASIS simulation intelligence data.
 *
 * Manages simulation runs, per-story metrics, knowledge graph data,
 * and derived health status. Data is fetched from Supabase (runs/metrics)
 * and the OASIS service (graph/predictions).
 */

import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import type {
  SimulationRun,
  StoryMetric,
  GraphData,
  PredictResponse,
  SimHealthStatus,
  SimulationReport,
} from "@/types/simulation";

const WEBHOOK_BASE = import.meta.env.VITE_N8N_WEBHOOK_URL || "/webhook";

/**
 * Seed data shown when no real simulation runs exist.
 * Provides a populated experience for new users until the first
 * scheduled simulation completes.
 */
const SEED_RUN: SimulationRun = {
  run_id: "seed-demo-run",
  status: "completed",
  agent_count: 50,
  simulation_steps: 3,
  story_count: 5,
  total_actions: 847,
  polarization_index: 0.34,
  echo_chamber_score: 0.22,
  duration_seconds: 42.5,
  metrics: [],
  created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  completed_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
};

const SEED_RECENT_RUNS: SimulationRun[] = [
  { ...SEED_RUN, polarization_index: 0.34, echo_chamber_score: 0.22, total_actions: 847 },
  { ...SEED_RUN, run_id: "seed-2", polarization_index: 0.29, echo_chamber_score: 0.18, total_actions: 792, completed_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString() },
  { ...SEED_RUN, run_id: "seed-3", polarization_index: 0.41, echo_chamber_score: 0.31, total_actions: 923, completed_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString() },
  { ...SEED_RUN, run_id: "seed-4", polarization_index: 0.37, echo_chamber_score: 0.25, total_actions: 811, completed_at: new Date(Date.now() - 14 * 60 * 60 * 1000).toISOString() },
  { ...SEED_RUN, run_id: "seed-5", polarization_index: 0.26, echo_chamber_score: 0.15, total_actions: 756, completed_at: new Date(Date.now() - 18 * 60 * 60 * 1000).toISOString() },
  { ...SEED_RUN, run_id: "seed-6", polarization_index: 0.44, echo_chamber_score: 0.35, total_actions: 901, completed_at: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString() },
  { ...SEED_RUN, run_id: "seed-7", polarization_index: 0.31, echo_chamber_score: 0.20, total_actions: 834, completed_at: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString() },
];

interface SimulationState {
  /** Latest simulation run. */
  latestRun: SimulationRun | null;
  /** Historical runs for sparklines (last 7). */
  recentRuns: SimulationRun[];
  /** Per-story metrics from the latest run, keyed by story_id. */
  metricsByStory: Record<string, StoryMetric>;
  /** Knowledge graph data for the current view. */
  graph: GraphData;
  /** Derived health status for the sim status dot. */
  healthStatus: SimHealthStatus;
  /** Latest generated report. */
  report: SimulationReport | null;
  /** Report generation loading state. */
  reportLoading: boolean;
  /** Loading state. */
  loading: boolean;
  /** Error message. */
  error: string | null;

  /** Fetch the latest simulation run + metrics from Supabase. */
  fetchLatest: () => Promise<void>;
  /** Fetch recent runs for sparkline trends. */
  fetchRecentRuns: () => Promise<void>;
  /** Get metrics for a specific story. */
  getStoryMetric: (storyId: string) => StoryMetric | null;
  /** Fetch knowledge graph for a story (or 'all'). */
  fetchGraph: (storyId?: string) => Promise<void>;
  /** Trigger a new simulation via n8n webhook. */
  triggerSimulation: () => Promise<void>;
  /** Generate an intelligence report from the latest simulation run. */
  generateReport: () => Promise<void>;
  /** Run a what-if prediction. */
  predict: (
    scenario: string,
    storyId?: string,
    entityIds?: string[],
  ) => Promise<PredictResponse | null>;
}

/**
 * Derive health status from the latest run.
 *
 * Green: run < 4h ago, polarization < 0.5
 * Amber: run < 8h ago, or polarization 0.5-0.75
 * Red: run > 8h ago, or echo chamber detected (> 0.75)
 */
function deriveHealth(run: SimulationRun | null): SimHealthStatus {
  if (!run || !run.completed_at) return "unknown";

  const ageMs = Date.now() - new Date(run.completed_at).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  const pol = run.polarization_index;

  if (ageHours > 8 || pol > 0.75) return "red";
  if (ageHours > 4 || pol > 0.5) return "amber";
  return "green";
}

export const useSimulationStore = create<SimulationState>((set, get) => ({
  latestRun: null,
  recentRuns: [],
  metricsByStory: {},
  graph: { entities: [], relationships: [] },
  healthStatus: "unknown",
  report: null,
  reportLoading: false,
  loading: false,
  error: null,

  fetchLatest: async () => {
    set({ loading: true, error: null });
    try {
      const { data: runs } = await supabase
        .from("simulation_runs")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(1);

      if (!runs || runs.length === 0) {
        // Fall back to seed data for new users
        set({
          latestRun: SEED_RUN,
          recentRuns: SEED_RECENT_RUNS,
          healthStatus: deriveHealth(SEED_RUN),
          loading: false,
        });
        return;
      }

      const run = runs[0];
      const { data: metrics } = await supabase
        .from("simulation_metrics")
        .select("*")
        .eq("run_id", run.id);

      const storyMetrics = (metrics || []).map(
        (m): StoryMetric => ({
          story_id: m.story_id,
          engagement_rate: Number(m.engagement_rate),
          sentiment_ratio: Number(m.sentiment_ratio),
          share_velocity: Number(m.share_velocity),
          predicted_virality: Number(m.predicted_virality),
          like_count: m.like_count ?? 0,
          dislike_count: m.dislike_count ?? 0,
          share_count: m.share_count ?? 0,
          comment_count: m.comment_count ?? 0,
          propagation_depth: m.propagation_depth ?? 0,
        }),
      );

      const metricsByStory: Record<string, StoryMetric> = {};
      for (const m of storyMetrics) {
        metricsByStory[m.story_id] = m;
      }

      const latestRun: SimulationRun = {
        run_id: run.run_id,
        status: run.status,
        agent_count: run.agent_count,
        simulation_steps: run.simulation_steps,
        story_count: run.story_count,
        total_actions: run.total_actions ?? 0,
        polarization_index: Number(run.polarization_index ?? 0),
        echo_chamber_score: Number(run.echo_chamber_score ?? 0),
        duration_seconds: Number(run.duration_seconds ?? 0),
        metrics: storyMetrics,
        created_at: run.created_at,
        completed_at: run.completed_at,
      };

      set({
        latestRun,
        metricsByStory,
        healthStatus: deriveHealth(latestRun),
        loading: false,
      });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to fetch simulation",
        loading: false,
      });
    }
  },

  fetchRecentRuns: async () => {
    try {
      const { data: runs } = await supabase
        .from("simulation_runs")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false })
        .limit(7);

      if (runs && runs.length > 0) {
        set({
          recentRuns: runs.map(
            (r): SimulationRun => ({
              run_id: r.run_id,
              status: r.status,
              agent_count: r.agent_count,
              simulation_steps: r.simulation_steps,
              story_count: r.story_count,
              total_actions: r.total_actions ?? 0,
              polarization_index: Number(r.polarization_index ?? 0),
              echo_chamber_score: Number(r.echo_chamber_score ?? 0),
              duration_seconds: Number(r.duration_seconds ?? 0),
              metrics: [],
              created_at: r.created_at,
              completed_at: r.completed_at,
            }),
          ),
        });
      }
    } catch {
      // Silently fail — sparklines are non-critical
    }
  },

  getStoryMetric: (storyId: string) => {
    return get().metricsByStory[storyId] ?? null;
  },

  fetchGraph: async (storyId?: string) => {
    const projectId = storyId || "all";
    try {
      const resp = await fetch(
        `/api/oasis/graph/${projectId}`,
      );
      if (!resp.ok) {
        // Fallback: fetch from Supabase directly
        const { data: entities } = await supabase
          .from("entities")
          .select("*")
          .order("mention_count", { ascending: false })
          .limit(100);

        const { data: relationships } = await supabase
          .from("entity_relationships")
          .select("*")
          .limit(500);

        set({
          graph: {
            entities: entities || [],
            relationships: relationships || [],
          },
        });
        return;
      }
      const data = await resp.json();
      set({ graph: data });
    } catch {
      // Fallback to Supabase
      const { data: entities } = await supabase
        .from("entities")
        .select("*")
        .order("mention_count", { ascending: false })
        .limit(100);

      const { data: relationships } = await supabase
        .from("entity_relationships")
        .select("*")
        .limit(500);

      set({
        graph: {
          entities: entities || [],
          relationships: relationships || [],
        },
      });
    }
  },

  triggerSimulation: async () => {
    set({ loading: true, error: null });
    try {
      await fetch(`${WEBHOOK_BASE}/att-simulate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      // Don't wait for result — it runs async, UI will poll
      set({ loading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Failed to trigger simulation",
        loading: false,
      });
    }
  },

  generateReport: async () => {
    const run = get().latestRun;
    if (!run || run.run_id.startsWith("seed-")) {
      set({ error: "No real simulation data to generate a report from" });
      return;
    }
    set({ reportLoading: true, error: null });
    try {
      const resp = await fetch(
        `/api/oasis/report/generate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ run_id: run.run_id }),
        },
      );
      if (!resp.ok) throw new Error("Report generation failed");
      const report = (await resp.json()) as SimulationReport;
      set({ report, reportLoading: false });
    } catch (e) {
      set({
        error: e instanceof Error ? e.message : "Report generation failed",
        reportLoading: false,
      });
    }
  },

  predict: async (scenario, storyId, entityIds) => {
    try {
      const resp = await fetch(`/api/oasis/predict`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenario,
          story_id: storyId,
          entity_ids: entityIds || [],
        }),
      });
      if (!resp.ok) return null;
      return (await resp.json()) as PredictResponse;
    } catch {
      return null;
    }
  },
}));
