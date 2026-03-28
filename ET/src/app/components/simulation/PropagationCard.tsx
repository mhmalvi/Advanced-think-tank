/**
 * PropagationCard — horizontal bar chart showing engagement by agent archetype.
 */

import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from "recharts";

interface PropagationCardProps {
  /** Engagement rates per archetype (0-1). */
  archetypeData?: {
    name: string;
    engagement: number;
  }[];
}

/** Default archetype engagement (used when real per-archetype data isn't available). */
const DEFAULT_ARCHETYPES = [
  { name: "Analyst", engagement: 0.89 },
  { name: "Investor", engagement: 0.61 },
  { name: "Journalist", engagement: 0.55 },
  { name: "Policy", engagement: 0.42 },
  { name: "Academic", engagement: 0.38 },
  { name: "Public", engagement: 0.23 },
];

const COLORS = ["#E30613", "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d"];

export function PropagationCard({ archetypeData }: PropagationCardProps) {
  const data = archetypeData || DEFAULT_ARCHETYPES;

  return (
    <div className="p-3 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-2">
        Propagation by Archetype
      </h4>

      <div className="space-y-1.5">
        {data.map((item, i) => {
          const pct = Math.round(item.engagement * 100);
          return (
            <div key={item.name} className="flex items-center gap-2">
              <span className="text-[10px] text-stone-500 w-16 text-right shrink-0">
                {item.name}
              </span>
              <div className="flex-1 h-3 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${pct}%`,
                    backgroundColor: COLORS[i % COLORS.length],
                  }}
                />
              </div>
              <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 w-8 shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
