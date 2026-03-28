/**
 * SimulationPage — the graph-first simulation intelligence canvas.
 *
 * The knowledge graph IS the interface. MetricStrip at top, EntityGraph in center,
 * StoryDotNav at bottom, ContextPanel slides up on node click.
 */

import { useEffect, useState, useCallback, useRef } from "react";
import { Activity } from "lucide-react";
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

  // Get selected entity object
  const selectedEntity: Entity | null =
    graph.entities.find((e) => e.id === selectedEntityId) || null;

  // Get metrics related to the selected entity (via stories that mention it)
  const relatedMetrics = selectedEntity
    ? Object.values(metricsByStory)
    : [];

  // Stories that have simulation data
  const simStories = stories.filter((s) => metricsByStory[s.id]);

  // Handle story dot click — filter graph to that story's entities
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
            <div className="flex flex-col items-center justify-center h-full">
              <Activity className="size-10 text-stone-300 dark:text-stone-600 mb-3" />
              <p className="text-sm text-stone-500 dark:text-stone-400">
                No simulation or graph data yet
              </p>
              <p className="text-xs text-stone-400 mt-1 max-w-sm text-center">
                Click "Run Simulation" above, or wait for the scheduled 4-hour cycle.
                The knowledge graph populates as articles are ingested and entities extracted.
              </p>
            </div>
          )}
        </div>

        {/* Agent activity panel (slide-in) */}
        {showActions && (
          <div className="w-80 shrink-0">
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
