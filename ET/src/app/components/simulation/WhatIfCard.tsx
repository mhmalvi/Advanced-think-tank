/**
 * WhatIfCard — text input for what-if scenario predictions.
 * Calls the Aether /predict endpoint and streams the result in-place.
 */

import { useState } from "react";
import { Send, Loader2 } from "lucide-react";
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from "recharts";
import { useSimulationStore } from "@/stores/simulation";
import type { PredictResponse } from "@/types/simulation";

interface WhatIfCardProps {
  storyId?: string;
  entityIds?: string[];
}

export function WhatIfCard({ storyId, entityIds }: WhatIfCardProps) {
  const [scenario, setScenario] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PredictResponse | null>(null);
  const predict = useSimulationStore((s) => s.predict);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scenario.trim() || loading) return;

    setLoading(true);
    const response = await predict(scenario.trim(), storyId, entityIds);
    setResult(response);
    setLoading(false);
  };

  const radarData = result?.impact_scores
    ? Object.entries(result.impact_scores).map(([key, value]) => ({
        axis: key.charAt(0).toUpperCase() + key.slice(1),
        value: Math.round(value * 100),
      }))
    : [];

  return (
    <div className="p-3 rounded border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900">
      <h4 className="text-[10px] font-bold text-stone-500 uppercase tracking-wide mb-2">
        What If...
      </h4>

      <form onSubmit={handleSubmit} className="flex gap-2 mb-3">
        <input
          type="text"
          value={scenario}
          onChange={(e) => setScenario(e.target.value)}
          placeholder="What if the main event escalates further?"
          disabled={loading}
          className="flex-1 px-3 py-2 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-md outline-none focus:border-[#E30613]/50 transition-colors disabled:opacity-50 text-stone-900 dark:text-white placeholder:text-stone-400"
        />
        <button
          type="submit"
          disabled={loading || !scenario.trim()}
          className="px-3 py-2 bg-[#E30613] text-white rounded-md hover:bg-[#c00510] transition-colors disabled:opacity-50 shrink-0"
        >
          {loading ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <Send className="size-3.5" />
          )}
        </button>
      </form>

      {result && (
        <div className="space-y-3">
          <div className="text-xs text-stone-700 dark:text-stone-300 leading-relaxed prose-sm">
            {result.analysis.split("\n").map((para, i) => (
              <p key={i} className={i > 0 ? "mt-2" : ""}>
                {para}
              </p>
            ))}
          </div>

          {radarData.length > 0 && (
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData}>
                  <PolarGrid stroke="#a8a29e" strokeOpacity={0.3} />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fontSize: 10, fill: "#78716c" }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="#E30613"
                    fill="#E30613"
                    fillOpacity={0.2}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="flex items-center justify-between text-[10px] text-stone-400">
            <span>
              Confidence: {Math.round(result.confidence * 100)}%
            </span>
            {result.affected_entity_ids.length > 0 && (
              <span>
                {result.affected_entity_ids.length} entities affected
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
