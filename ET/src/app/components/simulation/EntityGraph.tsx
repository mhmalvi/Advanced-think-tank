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

  // Multi-hop cluster: all nodes reachable within 2 hops from selected node
  const connectedIds = useMemo(() => {
    if (!selectedEntityId) return null;
    const connected = new Set<string>();
    const queue: [string, number][] = [[selectedEntityId, 0]];
    connected.add(selectedEntityId);

    while (queue.length > 0) {
      const [nodeId, depth] = queue.shift()!;
      if (depth >= 2) continue; // 2-hop max
      const neighbors = adjacency.get(nodeId);
      if (!neighbors) continue;
      for (const nid of neighbors) {
        if (!connected.has(nid)) {
          connected.add(nid);
          queue.push([nid, depth + 1]);
        }
      }
    }
    return connected;
  }, [selectedEntityId, adjacency]);

  // 1-hop direct neighbors (for radial layout positioning)
  const directNeighborIds = useMemo(() => {
    if (!selectedEntityId) return new Set<string>();
    return adjacency.get(selectedEntityId) || new Set<string>();
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

    if (!connectedIds || connectedIds.size <= 1) {
      graphRef.current.centerAt(center.x, center.y, 500);
      graphRef.current.zoom(2.5, 500);
      return;
    }

    // Two orbits: inner ring (1-hop) and outer ring (2-hop)
    const hop1 = [...directNeighborIds];
    const hop2 = [...connectedIds].filter(
      (id) => id !== selectedEntityId && !directNeighborIds.has(id),
    );

    const innerRadius = Math.max(180, hop1.length * 35);
    const outerRadius = innerRadius + Math.max(140, hop2.length * 25);

    // Position 1-hop neighbors in inner ring
    hop1.forEach((nid, i) => {
      const angle = (2 * Math.PI * i) / hop1.length - Math.PI / 2;
      const nodeObj = graphData.nodes.find((n) => n.id === nid) as any;
      if (nodeObj) {
        nodeObj.fx = center.x + Math.cos(angle) * innerRadius;
        nodeObj.fy = center.y + Math.sin(angle) * innerRadius;
      }
    });

    // Position 2-hop neighbors in outer ring
    hop2.forEach((nid, i) => {
      const angle = (2 * Math.PI * i) / Math.max(1, hop2.length) - Math.PI / 4;
      const nodeObj = graphData.nodes.find((n) => n.id === nid) as any;
      if (nodeObj) {
        nodeObj.fx = center.x + Math.cos(angle) * outerRadius;
        nodeObj.fy = center.y + Math.sin(angle) * outerRadius;
      }
    });

    // Pin center
    center.fx = center.x;
    center.fy = center.y;

    graphRef.current.d3ReheatSimulation();

    const t = setTimeout(() => {
      // Zoom to fit the whole cluster
      const allPinned = [...hop1, ...hop2, selectedEntityId];
      const xs = allPinned.map((nid) => {
        const n = graphData.nodes.find((nn) => nn.id === nid) as any;
        return n?.fx ?? n?.x ?? center.x;
      });
      const ys = allPinned.map((nid) => {
        const n = graphData.nodes.find((nn) => nn.id === nid) as any;
        return n?.fy ?? n?.y ?? center.y;
      });
      const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
      const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
      graphRef.current.centerAt(cx, cy, 500);

      const span = Math.max(
        Math.max(...xs) - Math.min(...xs),
        Math.max(...ys) - Math.min(...ys),
      );
      const containerH = height || 500;
      const zoom = Math.min(2, Math.max(0.5, (containerH * 0.55) / (span || 400)));
      graphRef.current.zoom(zoom, 500);
    }, 400);

    return () => {
      clearTimeout(t);
      graphData.nodes.forEach((n: any) => {
        n.fx = undefined;
        n.fy = undefined;
      });
    };
  }, [selectedEntityId, connectedIds, directNeighborIds, graphData.nodes, height]);

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
      const isDirect = directNeighborIds.has(id);
      const isSecondHop = isConnected && !isDirect && !isSelected;
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
      ctx.fillStyle = isSecondHop ? `${color}88` : color;
      ctx.fill();

      // 2-hop indicator: dashed outer ring
      if (isSecondHop && connectedIds) {
        ctx.strokeStyle = `${color}40`;
        ctx.lineWidth = 1 / globalScale;
        ctx.setLineDash([3 / globalScale, 3 / globalScale]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

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
      }
    },
    [
      selectedEntityId,
      hoveredNodeId,
      connectedIds,
      directNeighborIds,
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
      const { source, target, label, weight } = link;
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
      const isFocusLink =
        bothConnected &&
        (source.id === selectedEntityId || target.id === selectedEntityId);
      const highlight = bothConnected && (!!selectedEntityId || anyHovered);

      // Dim unrelated links
      if (connectedIds && !bothConnected) {
        ctx.globalAlpha = 0.03;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(tx, ty);
        ctx.strokeStyle = isDark ? "#57534e" : "#d6d3d1";
        ctx.lineWidth = 0.3 / globalScale;
        ctx.stroke();
        ctx.globalAlpha = 1;
        return;
      }

      const hex = (v: number) =>
        Math.round(Math.min(1, v) * 255)
          .toString(16)
          .padStart(2, "0");

      const srcColor = TYPE_COLORS[source.entityType] || "#a8a29e";
      const tgtColor = TYPE_COLORS[target.entityType] || "#a8a29e";
      const opacity = isFocusLink
        ? 0.7
        : highlight
          ? Math.max(0.4, weight * 0.6)
          : Math.max(linkDim, weight * 0.2);
      const lw =
        (isFocusLink ? 2.5 : highlight ? 1.5 : Math.max(0.4, weight)) /
        globalScale;

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
      const aLen = (isFocusLink ? 10 : highlight ? 6 : 4) / globalScale;
      const tR = Math.max(5, Math.sqrt(target.mentionCount || 1) * 3);
      const ax = tx - Math.cos(angle) * (tR + 4 / globalScale);
      const ay = ty - Math.sin(angle) * (tR + 4 / globalScale);
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

      // ── Relationship label ON the line (focus mode or zoomed in) ──
      if ((isFocusLink || (highlight && globalScale > 1) || globalScale > 1.8) && label) {
        const midX = (sx + tx) / 2;
        const midY = (sy + ty) / 2;
        const text = label.replace(/_/g, " ");
        const fs = isFocusLink
          ? Math.max(10, 13 / globalScale)
          : Math.max(7, 9 / globalScale);
        ctx.font = `${isFocusLink ? "600 " : ""}${fs}px Inter, system-ui, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        const tw = ctx.measureText(text).width;
        const pad = 4 / globalScale;

        // Rotated background pill aligned to the line
        ctx.save();
        ctx.translate(midX, midY);
        let rot = Math.atan2(ty - sy, tx - sx);
        // Keep text upright
        if (rot > Math.PI / 2) rot -= Math.PI;
        if (rot < -Math.PI / 2) rot += Math.PI;
        ctx.rotate(rot);

        // Background
        ctx.fillStyle = isDark ? "rgba(23,23,23,0.95)" : "rgba(255,255,255,0.95)";
        ctx.fillRect(-tw / 2 - pad, -fs / 2 - pad * 0.5, tw + pad * 2, fs + pad);

        // Border
        if (isFocusLink) {
          ctx.strokeStyle = `${tgtColor}30`;
          ctx.lineWidth = 1 / globalScale;
          ctx.strokeRect(-tw / 2 - pad, -fs / 2 - pad * 0.5, tw + pad * 2, fs + pad);
        }

        // Text
        ctx.fillStyle = isFocusLink
          ? (isDark ? "#e7e5e4" : "#292524")
          : (isDark ? "#a8a29e" : "#78716c");
        ctx.fillText(text, 0, 0);
        ctx.restore();
      }
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
  const hop1Count = directNeighborIds.size;
  const hop2Count = connectedIds ? connectedIds.size - 1 - hop1Count : 0;

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
              {hop1Count} direct{hop2Count > 0 ? ` + ${hop2Count} extended` : ""} &middot; Click background to unfocus
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
