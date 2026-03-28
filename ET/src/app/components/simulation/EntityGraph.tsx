/**
 * EntityGraph — interactive force-directed knowledge graph using react-force-graph-2d.
 *
 * Node sizes = mention count. Colors = entity type cluster.
 * Click a node to select it and show the context panel.
 */

import { useRef, useCallback, useEffect, useMemo } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { Entity, EntityRelationship } from "@/types/simulation";

const TYPE_COLORS: Record<string, string> = {
  person: "#3b82f6",
  organization: "#8b5cf6",
  country: "#E30613",
  commodity: "#f59e0b",
  event: "#06b6d4",
  policy: "#10b981",
  technology: "#ec4899",
};

interface EntityGraphProps {
  entities: Entity[];
  relationships: EntityRelationship[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
  /** Pulsing entity IDs (e.g., affected by what-if). */
  pulsingIds?: string[];
  height?: number;
}

export function EntityGraph({
  entities,
  relationships,
  selectedEntityId,
  onSelectEntity,
  pulsingIds = [],
  height = 500,
}: EntityGraphProps) {
  const graphRef = useRef<any>(null);

  // Build graph data for force-graph
  const graphData = useMemo(() => {
    const nodeSet = new Set(entities.map((e) => e.id));
    return {
      nodes: entities.map((e) => ({
        id: e.id,
        name: e.name,
        entityType: e.entity_type,
        mentionCount: e.mention_count,
        val: Math.max(2, Math.sqrt(e.mention_count) * 3),
      })),
      links: relationships
        .filter(
          (r) => nodeSet.has(r.source_entity_id) && nodeSet.has(r.target_entity_id),
        )
        .map((r) => ({
          source: r.source_entity_id,
          target: r.target_entity_id,
          label: r.relationship_type,
          weight: r.weight,
        })),
    };
  }, [entities, relationships]);

  // Center graph on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit(400, 40);
    }, 500);
    return () => clearTimeout(timer);
  }, [graphData]);

  // Center on selected node
  useEffect(() => {
    if (selectedEntityId && graphRef.current) {
      const node = graphData.nodes.find((n) => n.id === selectedEntityId);
      if (node) {
        graphRef.current.centerAt((node as any).x, (node as any).y, 300);
      }
    }
  }, [selectedEntityId, graphData.nodes]);

  const handleNodeClick = useCallback(
    (node: any) => {
      onSelectEntity(node.id === selectedEntityId ? null : node.id);
    },
    [onSelectEntity, selectedEntityId],
  );

  const handleBackgroundClick = useCallback(() => {
    onSelectEntity(null);
  }, [onSelectEntity]);

  // Custom node rendering
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x, y, name, entityType, mentionCount, id } = node;
      const radius = Math.max(4, Math.sqrt(mentionCount) * 2.5);
      const isSelected = id === selectedEntityId;
      const isPulsing = pulsingIds.includes(id);
      const color = TYPE_COLORS[entityType] || "#78716c";
      const fontSize = Math.max(8, 11 / globalScale);

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // Selected ring
      if (isSelected) {
        ctx.strokeStyle = "#E30613";
        ctx.lineWidth = 2.5 / globalScale;
        ctx.stroke();
      }

      // Pulsing glow
      if (isPulsing) {
        ctx.beginPath();
        ctx.arc(x, y, radius + 4, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}80`;
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
      }

      // Label (only show when zoomed in enough or for selected/large nodes)
      if (globalScale > 0.8 || isSelected || mentionCount > 5) {
        ctx.font = `${isSelected ? "bold " : ""}${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";
        ctx.fillStyle = isSelected ? "#E30613" : "#57534e";
        ctx.fillText(name, x, y + radius + 2);
      }
    },
    [selectedEntityId, pulsingIds],
  );

  // Link rendering
  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { source, target, label, weight } = link;
      if (typeof source !== "object" || typeof target !== "object") return;

      const sx = source.x;
      const sy = source.y;
      const tx = target.x;
      const ty = target.y;

      // Line
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = `rgba(168, 162, 158, ${Math.max(0.1, weight * 0.4)})`;
      ctx.lineWidth = Math.max(0.5, weight * 2) / globalScale;
      ctx.stroke();

      // Label (only when zoomed in)
      if (globalScale > 1.2 && label) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        const fontSize = Math.max(7, 9 / globalScale);
        ctx.font = `${fontSize}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#a8a29e";
        ctx.fillText(label, midX, midY);
      }
    },
    [],
  );

  if (entities.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-stone-400 text-sm"
        style={{ height }}
      >
        No entity data. Run a graph build to populate.
      </div>
    );
  }

  return (
    <ForceGraph2D
      ref={graphRef}
      graphData={graphData}
      width={undefined}
      height={height}
      nodeCanvasObject={nodeCanvasObject}
      linkCanvasObject={linkCanvasObject}
      onNodeClick={handleNodeClick}
      onBackgroundClick={handleBackgroundClick}
      nodePointerAreaPaint={(node: any, color, ctx) => {
        const radius = Math.max(6, Math.sqrt(node.mentionCount) * 3);
        ctx.beginPath();
        ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
      }}
      cooldownTicks={60}
      d3AlphaDecay={0.02}
      d3VelocityDecay={0.3}
      linkDirectionalParticles={0}
      enableZoomInteraction={true}
      enablePanInteraction={true}
      backgroundColor="transparent"
    />
  );
}
