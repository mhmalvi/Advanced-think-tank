/**
 * EntityGraph — interactive force-directed knowledge graph.
 *
 * Node sizes = mention count. Colors = entity type.
 * Click a node to select it → ContextPanel slides up.
 * Hover for tooltip. Scroll to zoom. Drag to pan.
 */

import { useRef, useCallback, useEffect, useMemo, useState } from "react";
import ForceGraph2D from "react-force-graph-2d";
import type { Entity, EntityRelationship } from "@/types/simulation";

const TYPE_COLORS: Record<string, string> = {
  person: "#3b82f6",
  organization: "#8b5cf6",
  country: "#ef4444",
  commodity: "#f59e0b",
  event: "#06b6d4",
  policy: "#10b981",
  technology: "#ec4899",
};

const TYPE_LABELS: Record<string, string> = {
  person: "Person",
  organization: "Organization",
  country: "Country",
  commodity: "Commodity",
  event: "Event",
  policy: "Policy",
  technology: "Technology",
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
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

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
        description: e.description || "",
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

  useEffect(() => {
    const timer = setTimeout(() => {
      graphRef.current?.zoomToFit(400, 80);
    }, 800);
    return () => clearTimeout(timer);
  }, [graphData]);

  useEffect(() => {
    if (selectedEntityId && graphRef.current) {
      const node = graphData.nodes.find((n) => n.id === selectedEntityId);
      if (node) {
        graphRef.current.centerAt((node as any).x, (node as any).y, 300);
        graphRef.current.zoom(2, 300);
      }
    }
  }, [selectedEntityId, graphData.nodes]);

  const handleNodeClick = useCallback(
    (node: any) => {
      onSelectEntity(node.id === selectedEntityId ? null : node.id);
    },
    [onSelectEntity, selectedEntityId],
  );

  const handleNodeHover = useCallback((node: any) => {
    setHoveredNodeId(node?.id ?? null);
    // Change cursor
    const el = graphRef.current?.renderer()?.domElement;
    if (el) el.style.cursor = node ? "pointer" : "grab";
  }, []);

  const handleBackgroundClick = useCallback(() => {
    onSelectEntity(null);
  }, [onSelectEntity]);

  // Colors that adapt to dark/light
  const labelBg = isDark ? "rgba(23,23,23,0.9)" : "rgba(255,255,255,0.92)";
  const labelColor = isDark ? "#e7e5e4" : "#292524";
  const labelDim = isDark ? "#a8a29e" : "#78716c";
  const linkBase = isDark ? 0.2 : 0.12;

  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x, y, name, entityType, mentionCount, id } = node;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const baseRadius = Math.max(4, Math.sqrt(mentionCount) * 2.8);
      const isSelected = id === selectedEntityId;
      const isHovered = id === hoveredNodeId;
      const isPulsing = pulsingIds.includes(id);
      const color = TYPE_COLORS[entityType] || "#78716c";
      const active = isSelected || isHovered;

      // Glow (stronger for selected/hovered)
      if (active || mentionCount > 2) {
        const glowRadius = baseRadius * (active ? 3.5 : 2);
        const glowAlpha = active ? "40" : "18";
        const grad = ctx.createRadialGradient(x, y, 0, x, y, glowRadius);
        grad.addColorStop(0, `${color}${glowAlpha}`);
        grad.addColorStop(1, `${color}00`);
        ctx.beginPath();
        ctx.arc(x, y, glowRadius, 0, 2 * Math.PI);
        ctx.fillStyle = grad;
        ctx.fill();
      }

      // Node circle
      ctx.beginPath();
      ctx.arc(x, y, baseRadius, 0, 2 * Math.PI);
      ctx.fillStyle = active ? color : `${color}${isDark ? "bb" : "cc"}`;
      ctx.fill();

      // Border ring
      if (active) {
        ctx.strokeStyle = isDark ? "#ffffff" : "#ffffff";
        ctx.lineWidth = 2 / globalScale;
        ctx.stroke();

        // Outer colored ring
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 4 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}50`;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // Pulsing dashed ring (what-if affected)
      if (isPulsing) {
        ctx.beginPath();
        ctx.arc(x, y, baseRadius + 8 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}80`;
        ctx.lineWidth = 2 / globalScale;
        ctx.setLineDash([4 / globalScale, 4 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // Label — always show for selected/hovered, otherwise by zoom level
      const showLabel = active || globalScale > 0.8 || mentionCount > 3;
      if (showLabel) {
        const labelText = name.length > 20 ? name.slice(0, 18) + "\u2026" : name;
        const fontSize = Math.max(9, (active ? 13 : 11) / globalScale);
        ctx.font = `${active ? "600 " : ""}${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";

        const textWidth = ctx.measureText(labelText).width;
        const pad = 4 / globalScale;
        const pillX = x - textWidth / 2 - pad;
        const pillY = y + baseRadius + 4 / globalScale;
        const pillW = textWidth + pad * 2;
        const pillH = fontSize + pad;

        // Background pill
        ctx.fillStyle = labelBg;
        ctx.fillRect(pillX, pillY, pillW, pillH);

        // Text
        ctx.textBaseline = "top";
        ctx.fillStyle = active ? color : labelColor;
        ctx.fillText(labelText, x, pillY + pad * 0.3);

        // Type label under name for selected node
        if (isSelected) {
          const typeName = TYPE_LABELS[entityType] || entityType;
          const tSize = Math.max(7, 9 / globalScale);
          ctx.font = `500 ${tSize}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = labelDim;
          ctx.fillText(typeName, x, pillY + pillH + 1 / globalScale);
        }
      }

      // Mention count inside node (for larger nodes)
      if (mentionCount > 2 && baseRadius > 8 && globalScale > 0.6) {
        const countSize = Math.max(7, 10 / globalScale);
        ctx.font = `700 ${countSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#ffffff";
        ctx.fillText(String(mentionCount), x, y);
      }
    },
    [selectedEntityId, hoveredNodeId, pulsingIds, isDark, labelBg, labelColor, labelDim],
  );

  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { source, target, label, weight } = link;
      if (typeof source !== "object" || typeof target !== "object") return;

      const sx = source.x;
      const sy = source.y;
      const tx = target.x;
      const ty = target.y;
      if (
        !Number.isFinite(sx) ||
        !Number.isFinite(sy) ||
        !Number.isFinite(tx) ||
        !Number.isFinite(ty)
      )
        return;

      const isConnected =
        source.id === selectedEntityId ||
        target.id === selectedEntityId ||
        source.id === hoveredNodeId ||
        target.id === hoveredNodeId;

      const sourceColor = TYPE_COLORS[source.entityType] || "#a8a29e";
      const targetColor = TYPE_COLORS[target.entityType] || "#a8a29e";
      const opacity = isConnected
        ? Math.max(0.4, weight * 0.6)
        : Math.max(linkBase, weight * 0.25);
      const lineWidth =
        (isConnected ? Math.max(1, weight * 2.5) : Math.max(0.5, weight * 1.2)) /
        globalScale;

      // Line
      const grad = ctx.createLinearGradient(sx, sy, tx, ty);
      const hex = (v: number) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0");
      grad.addColorStop(0, `${sourceColor}${hex(opacity)}`);
      grad.addColorStop(1, `${targetColor}${hex(opacity)}`);

      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      // Arrowhead
      const angle = Math.atan2(ty - sy, tx - sx);
      const arrowLen = (isConnected ? 7 : 4) / globalScale;
      const tRadius = Math.max(4, Math.sqrt(target.mentionCount || 1) * 2.8);
      const ax = tx - Math.cos(angle) * (tRadius + 3 / globalScale);
      const ay = ty - Math.sin(angle) * (tRadius + 3 / globalScale);

      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle - Math.PI / 7),
        ay - arrowLen * Math.sin(angle - Math.PI / 7),
      );
      ctx.lineTo(
        ax - arrowLen * Math.cos(angle + Math.PI / 7),
        ay - arrowLen * Math.sin(angle + Math.PI / 7),
      );
      ctx.closePath();
      ctx.fillStyle = `${targetColor}${hex(Math.min(1, opacity * 2))}`;
      ctx.fill();

      // Relationship label
      if ((globalScale > 1.2 || isConnected) && label) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        const fontSize = Math.max(7, 9 / globalScale);
        ctx.font = `${fontSize}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const text = label.replace(/_/g, " ");
        const tw = ctx.measureText(text).width;

        // Background
        ctx.fillStyle = labelBg;
        ctx.fillRect(midX - tw / 2 - 2, midY - fontSize / 2 - 1, tw + 4, fontSize + 2);

        ctx.fillStyle = isConnected ? (isDark ? "#d6d3d1" : "#57534e") : labelDim;
        ctx.fillText(text, midX, midY);
      }
    },
    [selectedEntityId, hoveredNodeId, isDark, linkBase, labelBg, labelDim],
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
        onNodeHover={handleNodeHover}
        onBackgroundClick={handleBackgroundClick}
        nodePointerAreaPaint={(node: any, color, ctx) => {
          const radius = Math.max(10, Math.sqrt(node.mentionCount) * 4);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        cooldownTicks={100}
        d3AlphaDecay={0.012}
        d3VelocityDecay={0.2}
        linkDirectionalParticles={1}
        linkDirectionalParticleWidth={(link: any) => {
          const connected =
            link.source?.id === selectedEntityId ||
            link.target?.id === selectedEntityId;
          return connected ? 3 : 1.5;
        }}
        linkDirectionalParticleSpeed={0.004}
        linkDirectionalParticleColor={(link: any) => {
          const c = TYPE_COLORS[link.target?.entityType] || "#a8a29e";
          return isDark ? `${c}90` : `${c}60`;
        }}
        enableZoomInteraction={true}
        enablePanInteraction={true}
        backgroundColor="transparent"
      />

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex flex-wrap gap-1.5 pointer-events-none">
        {activeTypes.map((type) => (
          <div
            key={type}
            className="flex items-center gap-1 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-full px-2 py-0.5 shadow-sm"
          >
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[type] || "#78716c" }}
            />
            <span className="text-[9px] font-medium text-stone-600 dark:text-stone-300 capitalize">
              {type}
            </span>
          </div>
        ))}
      </div>

      {/* Stats + instructions */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
            {entities.length} entities &middot; {relationships.length} relationships
          </span>
        </div>
        <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-[9px] text-stone-400 dark:text-stone-500">
            Click node to inspect &middot; Scroll to zoom &middot; Drag to pan
          </span>
        </div>
      </div>
    </div>
  );
}
