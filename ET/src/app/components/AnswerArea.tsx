import { BarChart3 } from "lucide-react";
import { useState } from "react";
import { useLocaleStore } from "@/stores/locale";
import { useAppStore } from "@/stores/app";

export function AnswerArea() {
  const { t } = useLocaleStore();
  const currentQuery = useAppStore((s) => s.currentQuery);
  const [hoveredCitationId, setHoveredCitationId] = useState<string | null>(null);

  // Empty state when no query has been run
  if (!currentQuery?.analysis) {
    return (
      <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-white dark:bg-[#0a0a0b]">
        <div className="max-w-[1800px] mx-auto flex items-center justify-center min-h-[200px]">
          <div className="text-center">
            <BarChart3 className="size-8 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
            <p className="text-sm text-stone-400 dark:text-stone-600">
              {currentQuery ? "Analysis unavailable" : "Submit a query to see AI-powered analysis"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { analysis } = currentQuery;
  const citations = analysis.citations;
  const confidencePct = Math.round(analysis.confidence * (analysis.confidence > 1 ? 1 : 100));

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 bg-white dark:bg-[#0a0a0b]">
      <div className="max-w-[1800px] mx-auto">
        <div className="mb-8 border-b border-stone-200 dark:border-[#1C1C1D] pb-8">

          <div className="flex items-center justify-between mb-6">
            <h2 className="text-[15px] font-bold text-stone-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="size-4 text-[#ef4444]" /> {t.answer.analysis}
            </h2>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-2 py-0.5 rounded-full border border-[#059669]/30 bg-[#059669]/10">
                <span className="text-[11px] font-bold text-[#10b981] tracking-wide">{t.answer.confidence} {confidencePct}%</span>
              </div>
              <span className="text-[12px] text-stone-400">{citations.length} {t.answer.sourcesLabel}</span>
            </div>
          </div>

          <div className="prose dark:prose-invert max-w-none text-[15px] leading-relaxed text-stone-600 dark:text-[#7D7D82] whitespace-pre-wrap">
            {analysis.content}
          </div>

          {citations.length > 0 && (
            <div className="flex flex-wrap items-center gap-3 mt-8">
              {citations.map((c) => (
                <a
                  key={c.id}
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                    hoveredCitationId === c.id
                      ? "border-[#ef4444]/50 bg-[#ef4444]/10"
                      : "border-stone-200 dark:border-[#1C1C1D] bg-stone-100 dark:bg-[#111112] hover:bg-stone-200 dark:hover:bg-[#1C1C1D]"
                  }`}
                  onMouseEnter={() => setHoveredCitationId(c.id)}
                  onMouseLeave={() => setHoveredCitationId(null)}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444]"></div>
                  <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300">{c.source_name}</span>
                  <span className="text-[10px] text-stone-500 font-mono">{Math.round(c.relevance_score * 100)}%</span>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* Query text for context */}
        <div className="text-xs text-stone-400 dark:text-stone-600 font-mono">
          Query: "{currentQuery.query_text}"
        </div>
      </div>
    </div>
  );
}
