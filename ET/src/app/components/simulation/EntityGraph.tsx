/**
 * EntityGraph — interactive force-directed knowledge graph.
 *
 * Click a node → "Focus Mode": connected nodes orbit around it in a radial layout
 * with clear relationship labels. Unconnected nodes dim out.
 * Click background → return to full graph view.
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

const TYPE_EMOJI: Record<string, string> = {
  person: "\u{1F464}",
  organization: "\u{1F3E2}",
  country: "\u{1F30D}",
  commodity: "\u{1F4E6}",
  event: "\u{26A1}",
  policy: "\u{1F4DC}",
  technology: "\u{1F4BB}",
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
  const containerRef = useRef<HTMLDivElement>(null);

  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  // Build adjacency map for focus mode
  const adjacency = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const r of relationships) {
      if (!map.has(r.source_entity_id)) map.set(r.source_entity_id, new Set());
      if (!map.has(r.target_entity_id)) map.set(r.target_entity_id, new Set());
      map.get(r.source_entity_id)!.add(r.target_entity_id);
      map.get(r.target_entity_id)!.add(r.source_entity_id);
    }
    return map;
  }, [relationships]);

  // Which nodes are connected to selected
  const connectedIds = useMemo(() => {
    if (!selectedEntityId) return null;
    const connected = new Set<string>();
    connected.add(selectedEntityId);
    const neighbors = adjacency.get(selectedEntityId);
    if (neighbors) neighbors.forEach((id) => connected.add(id));
    return connected;
  }, [selectedEntityId, adjacency]);

  // Relationship lookup for labels
  const relMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of relationships) {
      map.set(`${r.source_entity_id}__${r.target_entity_id}`, r.relationship_type);
      map.set(`${r.target_entity_id}__${r.source_entity_id}`, r.relationship_type);
    }
    return map;
  }, [relationships]);

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
            nodeSet.has(r.source_entity_id) && nodeSet.has(r.target_entity_id),
        )
        .map((r) => ({
          source: r.source_entity_id,
          target: r.target_entity_id,
          label: r.relationship_type,
          weight: r.weight,
        })),
    };
  }, [entities, relationships]);

  // Center on mount
  useEffect(() => {
    const t = setTimeout(() => graphRef.current?.zoomToFit(400, 80), 800);
    return () => clearTimeout(t);
  }, [graphData]);

  // Focus mode: spread connected nodes into a radial orbit around the selected node
  useEffect(() => {
    if (!selectedEntityId || !graphRef.current) return;

    const center = graphData.nodes.find((n) => n.id === selectedEntityId) as any;
    if (!center || !Number.isFinite(center.x)) return;

    const neighbors = adjacency.get(selectedEntityId);
    if (!neighbors || neighbors.size === 0) {
      graphRef.current.centerAt(center.x, center.y, 500);
      graphRef.current.zoom(2.5, 500);
      return;
    }

    // Calculate orbit radius based on neighbor count (more neighbors = wider orbit)
    const orbitRadius = Math.max(120, neighbors.size * 28);
    const neighborArr = [...neighbors];

    // Position each neighbor evenly around the center node
    neighborArr.forEach((nid, i) => {
      const angle = (2 * Math.PI * i) / neighborArr.length - Math.PI / 2;
      const targetX = center.x + Math.cos(angle) * orbitRadius;
      const targetY = center.y + Math.sin(angle) * orbitRadius;

      const nodeObj = graphData.nodes.find((n) => n.id === nid) as any;
      if (nodeObj) {
        // Pin the node to the orbital position
        nodeObj.fx = targetX;
        nodeObj.fy = targetY;
      }
    });

    // Pin the center node too
    center.fx = center.x;
    center.fy = center.y;

    // Reheat to let the layout settle, then zoom to fit the cluster
    graphRef.current.d3ReheatSimulation();

    const t = setTimeout(() => {
      // Zoom to fit just the selected cluster with generous padding
      const xs = [center.x, ...neighborArr.map((nid) => {
        const n = graphData.nodes.find((nn) => nn.id === nid) as any;
        return n?.fx ?? n?.x ?? 0;
      })];
      const ys = [center.y, ...neighborArr.map((nid) => {
        const n = graphData.nodes.find((nn) => nn.id === nid) as any;
        return n?.fy ?? n?.y ?? 0;
      })];
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      graphRef.current.centerAt(cx, cy, 500);

      // Zoom level based on orbit size
      const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
      const containerH = height || 500;
      const zoom = Math.min(2.5, Math.max(0.8, (containerH * 0.6) / (span || 300)));
      graphRef.current.zoom(zoom, 500);
    }, 300);

    return () => {
      clearTimeout(t);
      // Unpin all nodes when selection changes
      graphData.nodes.forEach((n: any) => {
        n.fx = undefined;
        n.fy = undefined;
      });
    };
  }, [selectedEntityId, graphData.nodes, adjacency, height]);

  const handleNodeClick = useCallback(
    (node: any) => {
      onSelectEntity(node.id === selectedEntityId ? null : node.id);
    },
    [onSelectEntity, selectedEntityId],
  );

  const handleNodeHover = useCallback(
    (node: any) => {
      setHoveredNodeId(node?.id ?? null);
      if (containerRef.current) {
        containerRef.current.style.cursor = node ? "pointer" : "grab";
      }
    },
    [],
  );

  const handleBackgroundClick = useCallback(() => {
    onSelectEntity(null);
    if (graphRef.current) graphRef.current.zoomToFit(400, 80);
  }, [onSelectEntity]);

  // Adaptive colors
  const bg = isDark ? "rgba(23,23,23,0.92)" : "rgba(255,255,255,0.92)";
  const textMain = isDark ? "#e7e5e4" : "#1c1917";
  const textDim = isDark ? "#78716c" : "#a8a29e";
  const linkDim = isDark ? 0.15 : 0.08;

  // ── Node renderer ──
  const nodeCanvasObject = useCallback(
    (node: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { x, y, name, entityType, mentionCount, id } = node;
      if (!Number.isFinite(x) || !Number.isFinite(y)) return;

      const r = Math.max(5, Math.sqrt(mentionCount) * 3);
      const isSelected = id === selectedEntityId;
      const isHovered = id === hoveredNodeId;
      const isConnected = connectedIds ? connectedIds.has(id) : true;
      const isPulsing = pulsingIds.includes(id);
      const color = TYPE_COLORS[entityType] || "#78716c";
      const active = isSelected || isHovered;
      const dimmed = connectedIds && !isConnected;

      // ── Dimmed nodes (not connected to selection) ──
      if (dimmed) {
        ctx.globalAlpha = 0.15;
        ctx.beginPath();
        ctx.arc(x, y, r * 0.8, 0, 2 * Math.PI);
        ctx.fillStyle = isDark ? "#44403c" : "#d6d3d1";
        ctx.fill();
        ctx.globalAlpha = 1;
        return;
      }

      // ── Glow ──
      if (active || mentionCount > 2) {
        const gr = ctx.createRadialGradient(x, y, 0, x, y, r * (active ? 4 : 2.2));
        gr.addColorStop(0, `${color}${active ? "35" : "15"}`);
        gr.addColorStop(1, `${color}00`);
        ctx.beginPath();
        ctx.arc(x, y, r * (active ? 4 : 2.2), 0, 2 * Math.PI);
        ctx.fillStyle = gr;
        ctx.fill();
      }

      // ── Circle ──
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fillStyle = color;
      ctx.fill();

      // ── Selection / hover ring ──
      if (active) {
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 2.5 / globalScale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, r + 5 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}60`;
        ctx.lineWidth = 1.5 / globalScale;
        ctx.stroke();
      }

      // ── Pulsing ring ──
      if (isPulsing) {
        ctx.beginPath();
        ctx.arc(x, y, r + 10 / globalScale, 0, 2 * Math.PI);
        ctx.strokeStyle = `${color}70`;
        ctx.lineWidth = 2 / globalScale;
        ctx.setLineDash([5 / globalScale, 5 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // ── Mention count inside node ──
      if (mentionCount > 1 && r > 7) {
        const fs = Math.max(7, Math.min(r * 1.1, 14) / globalScale);
        ctx.font = `700 ${fs}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillStyle = "#fff";
        ctx.fillText(String(mentionCount), x, y);
      }

      // ── Label ──
      const showLabel = active || globalScale > 0.7 || mentionCount > 2;
      if (showLabel) {
        const label = name.length > 22 ? name.slice(0, 20) + "\u2026" : name;
        const fs = Math.max(9, (active ? 14 : 11) / globalScale);
        ctx.font = `${active ? "600 " : "400 "}${fs}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";

        const tw = ctx.measureText(label).width;
        const pad = 4 / globalScale;
        const ly = y + r + 5 / globalScale;

        // Pill bg
        ctx.fillStyle = bg;
        ctx.fillRect(x - tw / 2 - pad, ly - pad * 0.5, tw + pad * 2, fs + pad);

        // Text
        ctx.textBaseline = "top";
        ctx.fillStyle = active ? color : textMain;
        ctx.fillText(label, x, ly);

        // Type label for selected
        if (isSelected) {
          const tl = (TYPE_EMOJI[entityType] || "") + " " + (entityType || "");
          const ts = Math.max(7, 10 / globalScale);
          ctx.font = `500 ${ts}px Inter, system-ui, sans-serif`;
          ctx.fillStyle = textDim;
          ctx.fillText(tl, x, ly + fs + 2 / globalScale);
        }

        // Relationship label from selected node (shown on connected neighbors)
        if (
          selectedEntityId &&
          !isSelected &&
          isConnected &&
          connectedIds
        ) {
          const relLabel = relMap.get(`${selectedEntityId}__${id}`);
          if (relLabel) {
            const rl = relLabel.replace(/_/g, " ");
            const rs = Math.max(8, 10 / globalScale);
            ctx.font = `italic 500 ${rs}px Inter, system-ui, sans-serif`;
            const rw = ctx.measureText(rl).width;
            const ry = ly - fs - 6 / globalScale;

            // Colored pill
            ctx.fillStyle = `${color}20`;
            ctx.fillRect(x - rw / 2 - 3, ry - 1, rw + 6, rs + 2);
            ctx.fillStyle = color;
            ctx.textBaseline = "top";
            ctx.fillText(rl, x, ry);
          }
        }
      }
    },
    [
      selectedEntityId,
      hoveredNodeId,
      connectedIds,
      pulsingIds,
      relMap,
      isDark,
      bg,
      textMain,
      textDim,
    ],
  );

  // ── Link renderer ──
  const linkCanvasObject = useCallback(
    (link: any, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const { source, target, weight } = link;
      if (typeof source !== "object" || typeof target !== "object") return;
      const { x: sx, y: sy } = source;
      const { x: tx, y: ty } = target;
      if (
        !Number.isFinite(sx) ||
        !Number.isFinite(sy) ||
        !Number.isFinite(tx) ||
        !Number.isFinite(ty)
      )
        return;

      const srcConnected = connectedIds ? connectedIds.has(source.id) : true;
      const tgtConnected = connectedIds ? connectedIds.has(target.id) : true;
      const bothConnected = srcConnected && tgtConnected;
      const anyHovered =
        source.id === hoveredNodeId || target.id === hoveredNodeId;
      const highlight = bothConnected && (!!selectedEntityId || anyHovered);

      // Dim links between unrelated nodes when a node is selected
      if (connectedIds && !bothConnected) {
        ctx.globalAlpha = 0.04;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = isDark ? "#57534e" : "#d6d3d1";
        ctx.lineWidth = 0.5 / globalScale;
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }

      const srcColor = TYPE_COLORS[source.entityType] || "#a8a29e";
      const tgtColor = TYPE_COLORS[target.entityType] || "#a8a29e";
      const opacity = highlight
        ? Math.max(0.5, weight * 0.8)
        : Math.max(linkDim, weight * 0.25);
      const lw =
        (highlight ? Math.max(1.5, weight * 3) : Math.max(0.4, weight)) /
        globalScale;

      const hex = (v: number) =>
        Math.round(Math.min(1, v) * 255)
          .toString(16)
          .padStart(2, "0");

      // Line
      const grad = ctx.createLinearGradient(sx, sy, tx, ty);
      grad.addColorStop(0, `${srcColor}${hex(opacity)}`);
      grad.addColorStop(1, `${tgtColor}${hex(opacity)}`);
      ctx.beginPath();
      ctx.moveTo(sx, sy);
      ctx.lineTo(tx, ty);
      ctx.strokeStyle = grad;
      ctx.lineWidth = lw;
      ctx.stroke();

      // Arrow
      const angle = Math.atan2(ty - sy, tx - sx);
      const aLen = (highlight ? 8 : 4) / globalScale;
      const tR = Math.max(5, Math.sqrt(target.mentionCount || 1) * 3);
      const ax = tx - Math.cos(angle) * (tR + 3 / globalScale);
      const ay = ty - Math.sin(angle) * (tR + 3 / globalScale);
      ctx.beginPath();
      ctx.moveTo(ax, ay);
      ctx.lineTo(
        ax - aLen * Math.cos(angle - Math.PI / 7),
        ay - aLen * Math.sin(angle - Math.PI / 7),
      );
      ctx.lineTo(
        ax - aLen * Math.cos(angle + Math.PI / 7),
        ay - aLen * Math.sin(angle + Math.PI / 7),
      );
      ctx.closePath();
      ctx.fillStyle = `${tgtColor}${hex(Math.min(1, opacity * 2))}`;
      ctx.fill();
    },
    [selectedEntityId, hoveredNodeId, connectedIds, isDark, linkDim],
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
  const neighborCount = connectedIds ? connectedIds.size - 1 : 0;

  return (
    <div ref={containerRef} className="relative w-full" style={{ height, cursor: "grab" }}>
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
          if (!Number.isFinite(node.x) || !Number.isFinite(node.y)) return;
          const radius = Math.max(12, Math.sqrt(node.mentionCount) * 5);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        enableNodeDrag={true}
        enablePointerInteraction={true}
        cooldownTicks={120}
        d3AlphaDecay={0.01}
        d3VelocityDecay={0.2}
        linkDirectionalParticles={(link: any) => {
          if (!connectedIds) return 1;
          const src = typeof link.source === "object" ? link.source.id : link.source;
          const tgt = typeof link.target === "object" ? link.target.id : link.target;
          return connectedIds.has(src) && connectedIds.has(tgt) ? 2 : 0;
        }}
        linkDirectionalParticleWidth={2}
        linkDirectionalParticleSpeed={0.005}
        linkDirectionalParticleColor={(link: any) => {
          const c =
            TYPE_COLORS[
              typeof link.target === "object"
                ? link.target.entityType
                : ""
            ] || "#a8a29e";
          return isDark ? `${c}aa` : `${c}70`;
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
              className="size-2.5 rounded-full"
              style={{ backgroundColor: TYPE_COLORS[type] || "#78716c" }}
            />
            <span className="text-[9px] font-medium text-stone-600 dark:text-stone-300 capitalize">
              {type}
            </span>
          </div>
        ))}
      </div>

      {/* Stats */}
      <div className="absolute top-3 right-3 flex flex-col items-end gap-1.5 pointer-events-none">
        <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-lg px-3 py-1.5 shadow-sm">
          <span className="text-[10px] font-mono text-stone-500 dark:text-stone-400">
            {entities.length} entities &middot; {relationships.length} relationships
          </span>
        </div>
        {!selectedEntityId && (
          <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
            <span className="text-[9px] text-stone-400 dark:text-stone-500">
              Click a node to focus &middot; Scroll to zoom &middot; Drag to pan
            </span>
          </div>
        )}
        {selectedEntityId && (
          <div className="bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm rounded-lg px-3 py-1 shadow-sm">
            <span className="text-[9px] text-stone-400 dark:text-stone-500">
              {neighborCount} connected &middot; Click background to unfocus
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
