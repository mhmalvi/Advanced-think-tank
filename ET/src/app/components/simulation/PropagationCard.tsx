/**
 * PropagationCard — animated horizontal bar chart showing engagement by agent archetype.
 * Bars animate in with staggered delays when the component mounts.
 */

import { useState, useEffect } from "react";

interface PropagationCardProps {
  archetypeData?: {
    name: string;
    engagement: number;
  }[];
}

const DEFAULT_ARCHETYPES = [
  { name: "Analyst", engagement: 0.89 },
  { name: "Investor", engagement: 0.61 },
  { name: "Journalist", engagement: 0.55 },
  { name: "Policy", engagement: 0.42 },
  { name: "Academic", engagement: 0.38 },
  { name: "Public", engagement: 0.23 },
];

const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#06b6d4",
  "#ec4899",
];

export function PropagationCard({ archetypeData }: PropagationCardProps) {
  const data = archetypeData || DEFAULT_ARCHETYPES;
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = requestAnimationFrame(() => setAnimated(true));
    return () => cancelAnimationFrame(t);
  }, []);

  return (
    <div className="p-3 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-2">
        Propagation by Archetype
      </h4>

      <div className="space-y-2">
        {data.map((item, i) => {
          const pct = Math.round(item.engagement * 100);
          return (
            <div key={item.name} className="flex items-center gap-2">
              {/* Archetype name with color dot */}
              <div className="flex items-center gap-1.5 w-20 shrink-0">
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                />
                <span className="text-[10px] text-stone-600 dark:text-stone-300 truncate">
                  {item.name}
                </span>
              </div>

              {/* Animated bar */}
              <div className="flex-1 h-4 bg-stone-100 dark:bg-stone-800 rounded overflow-hidden relative">
                <div
                  className="h-full rounded transition-all ease-out"
                  style={{
                    width: animated ? `${pct}%` : "0%",
                    backgroundColor: COLORS[i % COLORS.length],
                    transitionDuration: `${600 + i * 100}ms`,
                    transitionDelay: `${i * 80}ms`,
                  }}
                />
                {/* Shimmer animation on the bar */}
                {animated && (
                  <div
                    className="absolute inset-0 overflow-hidden rounded"
                    style={{ width: `${pct}%` }}
                  >
                    <div
                      className="absolute inset-0 -translate-x-full animate-[shimmer_2s_ease-in-out_infinite]"
                      style={{
                        background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent)`,
                        animationDelay: `${i * 200}ms`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* Percentage */}
              <span className="text-[10px] font-bold text-stone-700 dark:text-stone-300 w-8 text-right shrink-0">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>

      {/* CSS animation */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
