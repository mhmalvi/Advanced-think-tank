/**
 * Heatmap — archetype × topic engagement heatmap using Tailwind CSS grid.
 * Shows which archetypes engage most with which topics.
 */

const ARCHETYPES = ["Analyst", "Investor", "Journalist", "Policy", "Academic", "Public"];
const TOPICS = ["Geopolitics", "Economics", "Trade", "Energy", "Defense", "Tech", "Climate"];

/** Default heatmap data (archetype × topic engagement 0-1). */
const DEFAULT_DATA: Record<string, Record<string, number>> = {
  Analyst: { Geopolitics: 0.92, Economics: 0.65, Trade: 0.78, Energy: 0.45, Defense: 0.88, Tech: 0.35, Climate: 0.42 },
  Investor: { Geopolitics: 0.55, Economics: 0.95, Trade: 0.88, Energy: 0.72, Defense: 0.25, Tech: 0.68, Climate: 0.38 },
  Journalist: { Geopolitics: 0.82, Economics: 0.58, Trade: 0.62, Energy: 0.48, Defense: 0.75, Tech: 0.55, Climate: 0.65 },
  Policy: { Geopolitics: 0.72, Economics: 0.62, Trade: 0.85, Energy: 0.55, Defense: 0.42, Tech: 0.32, Climate: 0.78 },
  Academic: { Geopolitics: 0.88, Economics: 0.72, Trade: 0.65, Energy: 0.35, Defense: 0.68, Tech: 0.42, Climate: 0.58 },
  Public: { Geopolitics: 0.35, Economics: 0.42, Trade: 0.28, Energy: 0.55, Defense: 0.22, Tech: 0.62, Climate: 0.48 },
};

interface HeatmapProps {
  data?: Record<string, Record<string, number>>;
}

function cellColor(value: number): string {
  if (value >= 0.8) return "bg-red-500/80 text-white";
  if (value >= 0.6) return "bg-orange-400/70 text-white";
  if (value >= 0.4) return "bg-amber-300/60 text-stone-800";
  if (value >= 0.2) return "bg-yellow-200/50 text-stone-700";
  return "bg-stone-100 dark:bg-stone-800 text-stone-400";
}

export function Heatmap({ data = DEFAULT_DATA }: HeatmapProps) {
  return (
    <div className="p-3 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 overflow-x-auto">
      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-2">
        Archetype × Topic Engagement
      </h4>

      <div
        className="grid gap-0.5"
        style={{
          gridTemplateColumns: `80px repeat(${TOPICS.length}, 1fr)`,
        }}
      >
        {/* Header row */}
        <div />
        {TOPICS.map((topic) => (
          <div
            key={topic}
            className="text-[9px] font-medium text-stone-400 text-center py-1 truncate"
          >
            {topic}
          </div>
        ))}

        {/* Data rows */}
        {ARCHETYPES.map((archetype) => (
          <>
            <div
              key={`label-${archetype}`}
              className="text-[10px] font-medium text-stone-500 flex items-center pr-2"
            >
              {archetype}
            </div>
            {TOPICS.map((topic) => {
              const value = data[archetype]?.[topic] ?? 0;
              return (
                <div
                  key={`${archetype}-${topic}`}
                  className={`text-[9px] font-bold text-center py-1.5 rounded-sm ${cellColor(value)}`}
                  title={`${archetype} × ${topic}: ${(value * 100).toFixed(0)}%`}
                >
                  {Math.round(value * 100)}
                </div>
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}
