/**
 * SimulationPage — the graph-first simulation intelligence canvas.
 *
 * The knowledge graph IS the interface. MetricStrip at top, EntityGraph in center,
 * StoryDotNav at bottom, ContextPanel slides up on node click.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Activity, FlaskConical, Zap } from "lucide-react";
import { useSimulationStore } from "@/stores/simulation";
import { useStoriesStore } from "@/stores/stories";
import { MetricStrip } from "@/app/components/simulation/MetricStrip";
import { EntityGraph } from "@/app/components/simulation/EntityGraph";
import { ContextPanel } from "@/app/components/simulation/ContextPanel";
import { StoryDotNav } from "@/app/components/simulation/StoryDotNav";
import { ReportViewer } from "@/app/components/simulation/ReportViewer";
import { AgentActivityFeed } from "@/app/components/simulation/AgentActivityFeed";
import type { Entity } from "@/types/simulation";

export function SimulationPage() {
  const latestRun = useSimulationStore((s) => s.latestRun);
  const recentRuns = useSimulationStore((s) => s.recentRuns);
  const metricsByStory = useSimulationStore((s) => s.metricsByStory);
  const healthStatus = useSimulationStore((s) => s.healthStatus);
  const loading = useSimulationStore((s) => s.loading);
  const graph = useSimulationStore((s) => s.graph);
  const actions = useSimulationStore((s) => s.actions);
  const report = useSimulationStore((s) => s.report);
  const reportLoading = useSimulationStore((s) => s.reportLoading);
  const fetchActions = useSimulationStore((s) => s.fetchActions);
  const fetchLatest = useSimulationStore((s) => s.fetchLatest);
  const fetchRecentRuns = useSimulationStore((s) => s.fetchRecentRuns);
  const fetchGraph = useSimulationStore((s) => s.fetchGraph);
  const triggerSimulation = useSimulationStore((s) => s.triggerSimulation);
  const generateReport = useSimulationStore((s) => s.generateReport);

  const stories = useStoriesStore((s) => s.stories);

  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [pulsingIds, setPulsingIds] = useState<string[]>([]);
  const [showReport, setShowReport] = useState(false);
  const [showActions, setShowActions] = useState(false);
  const graphContainerRef = useRef<HTMLDivElement>(null);
  const [graphHeight, setGraphHeight] = useState(400);

  // Load data on mount
  useEffect(() => {
    fetchLatest();
    fetchRecentRuns();
    fetchGraph();
    fetchActions();
  }, [fetchLatest, fetchRecentRuns, fetchGraph, fetchActions]);

  // Compute graph height from container
  useEffect(() => {
    const updateHeight = () => {
      if (graphContainerRef.current) {
        setGraphHeight(graphContainerRef.current.clientHeight);
      }
    };
    updateHeight();
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  const selectedEntity: Entity | null =
    graph.entities.find((e) => e.id === selectedEntityId) || null;

  const relatedMetrics = selectedEntity
    ? Object.values(metricsByStory)
    : [];

  const simStories = stories.filter((s) => metricsByStory[s.id]);

  const handleStorySelect = useCallback(
    (storyId: string) => {
      setActiveStoryId((prev) => (prev === storyId ? null : storyId));
      setSelectedEntityId(null);
      fetchGraph(storyId === activeStoryId ? undefined : storyId);
    },
    [activeStoryId, fetchGraph],
  );

  const handleSelectEntity = useCallback((entityId: string | null) => {
    setSelectedEntityId(entityId);
  }, []);

  const hasData = graph.entities.length > 0 || latestRun;

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Metric Strip */}
      <MetricStrip
        latestRun={latestRun}
        recentRuns={recentRuns}
        healthStatus={healthStatus}
        loading={loading}
        reportLoading={reportLoading}
        actionsCount={actions.length}
        onTriggerSimulation={triggerSimulation}
        onGenerateReport={async () => {
          await generateReport();
          setShowReport(true);
        }}
        onToggleActions={() => setShowActions((v) => !v)}
      />

      {/* Main area — graph + optional agent panel */}
      <div className="flex flex-1 overflow-hidden">
        {/* Graph */}
        <div ref={graphContainerRef} className="flex-1 relative overflow-hidden bg-white dark:bg-[#0a0a0b]">
          {hasData ? (
            <EntityGraph
              entities={graph.entities}
              relationships={graph.relationships}
              selectedEntityId={selectedEntityId}
              onSelectEntity={handleSelectEntity}
              pulsingIds={pulsingIds}
              height={graphHeight}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-full px-8">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-[#E30613]/10 rounded-full blur-2xl scale-150" />
                <div className="relative bg-stone-100 dark:bg-stone-800 rounded-2xl p-6">
                  <FlaskConical className="size-12 text-[#E30613]" />
                </div>
              </div>
              <h2 className="text-lg font-bold text-stone-900 dark:text-white mb-2">
                Aether Simulation Engine
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 max-w-md text-center mb-6">
                50 AI agents simulate how geopolitical stories spread, predicting engagement,
                polarization, and echo chamber formation before they happen.
              </p>
              <button
                onClick={triggerSimulation}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#E30613] text-white text-sm font-medium rounded-lg hover:bg-[#c00510] transition-colors disabled:opacity-50"
              >
                <Zap className="size-4" />
                {loading ? "Running Simulation..." : "Run First Simulation"}
              </button>
              <p className="text-[10px] text-stone-400 mt-3">
                Takes ~30-60 seconds. The knowledge graph populates as entities are extracted.
              </p>
            </div>
          )}

          {/* Loading overlay on graph */}
          {loading && hasData && (
            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-[1px] flex items-center justify-center z-10">
              <div className="flex items-center gap-3 bg-white dark:bg-stone-900 rounded-lg shadow-lg px-5 py-3 border border-stone-200 dark:border-stone-700">
                <div className="size-4 border-2 border-[#E30613] border-t-transparent rounded-full animate-spin" />
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Running simulation...
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Agent activity panel (slide-in) */}
        {showActions && (
          <div className="w-80 shrink-0 border-l border-stone-200 dark:border-stone-800">
            <AgentActivityFeed
              actions={actions}
              onClose={() => setShowActions(false)}
            />
          </div>
        )}
      </div>

      {/* Story dot navigation */}
      {simStories.length > 0 && (
        <StoryDotNav
          stories={simStories}
          metricsByStory={metricsByStory}
          activeStoryId={activeStoryId}
          onSelect={handleStorySelect}
        />
      )}

      {/* Context panel — slides up when entity selected */}
      <ContextPanel
        entity={selectedEntity}
        relatedMetrics={relatedMetrics}
        polarizationIndex={latestRun?.polarization_index ?? 0}
        onClose={() => setSelectedEntityId(null)}
      />

      {/* Report viewer modal */}
      {showReport && report && (
        <ReportViewer
          content={report.content}
          runId={report.run_id}
          onClose={() => setShowReport(false)}
        />
      )}
    </div>
  );
}
