/**
 * EntityGraph — interactive force-directed knowledge graph using react-force-graph-2d.
 *
 * Node sizes = mention count. Colors = entity type cluster.
 * Click a node to select it and show the context panel.
 * Directional particles show relationship flow.
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

const TYPE_LABELS: Record<string, string> = {
  person: "Person",
  organization: "Org",
  country: "Country",
  commodity: "Commodity",
  event: "Event",
  policy: "Policy",
  technology: "Tech",
};

interface EntityGraphProps {
  entities: Entity[];
  relationships: EntityRelationship[];
  selectedEntityId: string | null;
  onSelectEntity: (entityId: string | null) => void;
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
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

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
          (r) =>
            nodeSet.has(r.source_entity_id) &&
            nodeSet.has(r.target_entity_id),
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
      graphRef.current?.zoomToFit(400, 60);
    }, 600);
    return () => clearTimeout(timer);
  }, [graphData]);

  // Center on selected node
  useEffect(() => {
    if (selectedEntityId && graphRef.current) {
      const node = graphData.nodes.find((n) => n.id === selectedEntityId);
      if (node) {
        graphRef.current.centerAt((node as any).x, (node as any).y, 300);
        graphRef.current.zoom(2.5, 300);
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

  // Custom node rendering with glow and improved labels
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x, y, name, entityType, mentionCount, id } = node;
      const baseRadius = Math.max(5, Math.sqrt(mentionCount) * 3);
      const isSelected = id === selectedEntityId;
      const isPulsing = pulsingIds.includes(id);
      const color = TYPE_COLORS[entityType] || "#78716c";
      const fontSize = Math.max(9, 12 / globalScale);

      // Ambient glow for all nodes
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, baseRadius * 2.5);
      gradient.addColorStop(0, `${color}30`);
      gradient.addColorStop(1, `${color}00`);
      ctx.beginPath();
      ctx.arc(x, y, baseRadius * 2.5, 0, 2 * Math.PI);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Main node circle
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = isSelected ? color : `${color}cc`;
      ctx.fill();

      // Inner highlight (gives 3D effect)
      const innerGradient = ctx.createRadialGradient(
        x - baseRadius * 0.3,
        y - baseRadius * 0.3,
        0,
        x,
        y,
        baseRadius,
      );
      innerGradient.addColorStop(0, `${color}40`);
      innerGradient.addColorStop(0.5, "transparent");
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = innerGradient;
      ctx.fill();

      // Selected ring
      if (isSelected) {
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 3 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 5 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}80`;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Pulsing glow
      if (isPulsing) {
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 8 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}60`;
        ctx.lineWidth = 3 / globalScale;
        ctx.setLineDash([4 / globalScale, 4 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label
      const showLabel =
        globalScale > 0.7 || isSelected || mentionCount > 3;
      if (showLabel) {
        const labelText = name.length > 18 ? name.slice(0, 16) + "..." : name;
        ctx.font = `${isSelected ? "bold " : ""}${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "top";

        // Label background pill
        const textWidth = ctx.measureText(labelText).width;
        const padding = 3 / globalScale;
        const pillY = y + baseRadius + 3 / globalScale;
        ctx.fillStyle = isDark ? "rgba(10,10,11,0.8)" : "rgba(255,255,255,0.85)";
        ctx.beginPath();
        ctx.roundRect(
          x - textWidth / 2 - padding,
          pillY - 1 / globalScale,
          textWidth + padding * 2,
          fontSize + padding,
          3 / globalScale,
        );
        ctx.fill();

        // Label text
        ctx.fillStyle = isSelected
          ? color
          : isDark
            ? "#d6d3d1"
            : "#44403c";
        ctx.fillText(labelText, x, pillY);

        // Type badge for selected node
        if (isSelected && entityType) {
          const badge = TYPE_LABELS[entityType] || entityType;
          const badgeFontSize = Math.max(7, 9 / globalScale);
          ctx.font = `bold ${badgeFontSize}px Inter, system-ui, sans-serif`;
          const bw = ctx.measureText(badge).width;
          const bx = x - bw / 2 - 2 / globalScale;
          const by = pillY + fontSize + 2 / globalScale;
          ctx.fillStyle = `${color}20`;
          ctx.beginPath();
          ctx.roundRect(bx, by, bw + 4 / globalScale, badgeFontSize + 2 / globalScale, 2 / globalScale);
          ctx.fill();
          ctx.fillStyle = color;
          ctx.textBaseline = "top";
          ctx.fillText(badge, x, by + 1 / globalScale);
        }
      }
    },
    [selectedEntityId, pulsingIds, isDark],
  );

  // Link rendering with gradient
  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { source, target, label, weight } = link;
      if (typeof source !== "object" || typeof target !== "object") return;

      const sx = source.x;
      const sy = source.y;
      const tx = target.x;
      const ty = target.y;

      const sourceColor = TYPE_COLORS[source.entityType] || "#a8a29e";
      const targetColor = TYPE_COLORS[target.entityType] || "#a8a29e";
      const opacity = Math.max(0.08, weight * 0.3);
      const lineWidth = Math.max(0.5, weight * 1.5) / globalScale;

      // Gradient link
      const gradient = ctx.createLinearGradient(sx, sy, tx, ty);
      gradient.addColorStop(0, `${sourceColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`);
      gradient.addColorStop(1, `${targetColor}${Math.round(opacity * 255).toString(16).padStart(2, "0")}`);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = gradient;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Arrow head
      const angle = Math.atan2(ty - sy, tx - sx);
      const arrowLen = 5 / globalScale;
      const targetRadius = Math.max(5, Math.sqrt(target.mentionCount || 1) * 3);
      const ax = tx - Math.cos(angle) * (targetRadius + 2);
      const ay = ty - Math.sin(angle) * (targetRadius + 2);

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle - Math.PI / 6),
        ay - arrowLen * Math.sin(angle - Math.PI / 6),
      );
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle + Math.PI / 6),
        ay - arrowLen * Math.sin(angle + Math.PI / 6),
      );
      ctx.closePath();
      ctx.fillStyle = `${targetColor}${Math.round(opacity * 1.5 * 255).toString(16).padStart(2, "0")}`;
      ctx.fill();

      // Relationship label (zoomed in)
      if (globalScale > 1.5 && label) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        const fontSize = Math.max(7, 8 / globalScale);
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = isDark ? "#78716c" : "#a8a29e";
        ctx.fillText(label.replace(/_/g, " "), midX, midY);
      }
    },
    [isDark],
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

  // Legend
  const activeTypes = [...new Set(entities.map((e) => e.entity_type))].sort();

  return (
    <div className="relative w-full" style={{ height }}>
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
          const radius = Math.max(8, Math.sqrt(node.mentionCount) * 3.5);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        cooldownTicks={80}
        d3AlphaDecay={0.015}
        d3VelocityDecay={0.25}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={1.5}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={(link: any) => {
          const c = TYPE_COLORS[link.target?.entityType] || "#a8a29e";
          return `${c}60`;
        }}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor="transparent"
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-2 pointer-events-none">
        {activeTypes.map((type) => (
          <div key={type} className="flex items-center gap-1 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded px-1.5 py-0.5">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[type] || "#78716c" }}
            />
            <span className="text-[9px] font-medium text-stone-600 dark:text-stone-400 capitalize">
              {type}
            </span>
          </div>
        ))}
      </div>

      {/* Entity count badge */}
      <div className="absolute top-3 right-3 bg-white/80 dark:bg-stone-900/80 backdrop-blur-sm rounded px-2 py-1 pointer-events-none">
        <span className="text-[10px] font-mono text-stone-500">
          {entities.length} entities &middot; {relationships.length} links
        </span>
      </div>
    </div>
  );
}
