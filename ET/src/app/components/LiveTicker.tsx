import { AlertCircle } from "lucide-react";
import { useAppStore } from "@/stores/app";

export function LiveTicker() {
  const recentArticles = useAppStore((s) => s.recentArticles);

  const tickerItems = recentArticles.length > 0
    ? recentArticles.slice(0, 10).map((a) => `${a.source_name}: ${a.title}`)
    : [
        "Connecting to live data sources...",
        "Waiting for article feed...",
      ];

  return (
    <div className="bg-[#E94E3D] text-white overflow-hidden flex items-center h-8 shrink-0">
      <div className="bg-black/20 h-full flex items-center px-3 font-bold text-[10px] uppercase tracking-widest gap-1.5 shrink-0 z-10 border-r border-[#E94E3D]/50 shadow-[4px_0_8px_rgba(233,78,61,0.5)]">
        <AlertCircle className="size-3" />
        Live Ingestion
      </div>

      <div className="flex whitespace-nowrap overflow-hidden flex-1 relative">
        <div className="animate-[ticker_40s_linear_infinite] flex items-center gap-12 pl-4">
          {tickerItems.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wide">{item}</span>
            </div>
          ))}
          {tickerItems.map((item, i) => (
            <div key={`dup-${i}`} className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
              <span className="text-[11px] font-medium tracking-wide">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
