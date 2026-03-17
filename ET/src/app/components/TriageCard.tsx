import { Link } from "react-router-dom";
import { TriageData } from "@/app/data/mockTriageData";
import { Bookmark } from "lucide-react";
import { getSectorColor } from "@/lib/sectorColors";

export function TriageCard({
  data,
  forceCompact = false,
  isBookmarked = false,
  onToggleBookmark
}: {
  data: TriageData,
  forceCompact?: boolean,
  isBookmarked?: boolean,
  onToggleBookmark?: (id: string, e: React.MouseEvent) => void
}) {
  let tier = 2;
  if (data.metrics.confidence >= 85) tier = 1;
  if (data.metrics.confidence < 50) tier = 3;

  if (forceCompact) tier = 3;

  const colors = getSectorColor(data.sector);

  if (tier === 3) {
    return (
      <Link to={`/analysis/${data.id}`} className="group flex items-center gap-3 py-1.5 px-3 hover:bg-stone-50 dark:hover:bg-stone-900 border-b border-stone-200 dark:border-stone-800 last:border-0 transition-colors">
        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${data.metrics.urgency === 'critical' || data.metrics.urgency === 'high' ? colors.dot : 'bg-stone-300 dark:bg-stone-700'}`} />
        <span className={`text-[10px] font-mono font-bold shrink-0 w-8 ${
          data.metrics.confidence >= 85
            ? 'text-emerald-600 dark:text-emerald-400'
            : data.metrics.confidence >= 50
              ? 'text-amber-600 dark:text-amber-400'
              : 'text-stone-500'
        }`}>{data.metrics.confidence}%</span>

        <button
          onClick={(e) => onToggleBookmark?.(data.id, e)}
          className={`shrink-0 p-1 rounded hover:bg-stone-200 dark:hover:bg-stone-800 transition-colors ${isBookmarked ? 'text-amber-500' : 'text-stone-400 dark:text-stone-600'}`}
        >
          <Bookmark className="size-3" fill={isBookmarked ? "currentColor" : "none"} />
        </button>
        <h4 className="text-xs font-medium text-stone-800 dark:text-stone-300 truncate flex-1 group-hover:text-primary transition-colors">
          {data.headline}
        </h4>
        <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded shrink-0 hidden sm:block ${colors.bg} ${colors.text}`}>
          {data.sector}
        </span>
        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono shrink-0 w-12 text-right">
          {data.timestamp}
        </span>
      </Link>
    );
  }

  const isTier1 = tier === 1;

  return (
    <Link
      to={`/analysis/${data.id}`}
      className={`group flex flex-col bg-white dark:bg-[#0a0a0b] border ${isTier1 ? `border-l-2 border-y-stone-200 border-r-stone-200 dark:border-y-stone-800 dark:border-r-stone-800 ${colors.dot.replace('bg-', 'border-l-')}` : 'border-stone-200 dark:border-stone-800'} hover:border-stone-400 dark:hover:border-stone-600 transition-colors overflow-hidden ${isTier1 ? 'md:col-span-2 lg:col-span-2' : ''}`}
    >
      <div className={`flex flex-1 ${isTier1 ? 'p-4 gap-4 flex-col sm:flex-row' : 'p-3 flex-col gap-2'}`}>
        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                {data.sector}
              </span>
              <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                data.metrics.confidence >= 85
                  ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
                  : data.metrics.confidence >= 50
                    ? 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
                    : 'text-stone-600 dark:text-stone-400 bg-stone-100 dark:bg-stone-900 border-stone-200 dark:border-stone-700'
              }`}>
                {data.metrics.confidence}%
              </span>
              {data.metrics.urgency !== 'low' && (
                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded ${
                  data.metrics.urgency === 'critical'
                    ? 'text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20'
                    : data.metrics.urgency === 'high'
                      ? 'text-orange-700 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20'
                      : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20'
                }`}>
                  {data.metrics.urgency}
                </span>
              )}
            </div>

            <button
              onClick={(e) => onToggleBookmark?.(data.id, e)}
              className={`shrink-0 p-1.5 rounded-full hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors ${isBookmarked ? 'text-amber-500' : 'text-stone-400 dark:text-stone-600'}`}
            >
              <Bookmark className="size-4" fill={isBookmarked ? "currentColor" : "none"} />
            </button>
          </div>

          <h3 className={`${isTier1 ? 'text-xl md:text-2xl font-bold mb-2' : 'text-sm font-semibold mb-1'} text-stone-900 dark:text-stone-100 leading-snug group-hover:text-primary transition-colors`}>
            {data.headline}
          </h3>

          {data.tldr && (
            <p className={`${isTier1 ? 'text-sm leading-relaxed mb-3 line-clamp-3' : 'text-xs leading-relaxed mb-2 line-clamp-2'} text-stone-700 dark:text-stone-300`}>
              {data.tldr}
            </p>
          )}

          <div className="mt-auto pt-2 flex items-center justify-between flex-wrap gap-2">
            <div className="flex flex-wrap gap-1">
              {data.entities.slice(0, isTier1 ? 5 : 3).map((entity: string) => (
                <span key={entity} className={`text-[9px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-500 hover:text-stone-800 dark:hover:text-stone-200 transition-colors bg-stone-50 dark:bg-stone-900/50 px-1.5 py-0.5 rounded border-l-2 ${colors.dot.replace('bg-', 'border-l-')} border-y border-r border-y-transparent border-r-transparent`}>
                  #{entity}
                </span>
              ))}
            </div>

            <div className="text-[10px] font-mono text-stone-500 dark:text-stone-400 flex items-center gap-2">
              <span title="Sources Synthesized">{data.metrics.sourceCount} SRC</span>
              <span>&bull;</span>
              <span>{data.timestamp}</span>
            </div>
          </div>
        </div>

        {isTier1 && data.imageUrl && (
          <div className="shrink-0 sm:w-32 lg:w-48 h-24 sm:h-auto rounded border border-stone-200 dark:border-stone-800 overflow-hidden relative grayscale group-hover:grayscale-0 transition-all duration-300">
             <img src={data.imageUrl} alt="" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
          </div>
        )}
      </div>
    </Link>
  );
}
