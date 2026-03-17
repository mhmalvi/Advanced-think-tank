import { TriageData } from "@/app/data/mockTriageData";
import { ExpirationBadge } from "@/app/components/ExpirationBadge";
import { Bookmark, AlertCircle, X } from "lucide-react";
import { Link } from "react-router-dom";
import { useLocaleStore } from "@/stores/locale";
import { getSectorColor } from "@/lib/sectorColors";

export interface BookmarkedItem extends TriageData {
  expiresAt: string;
}

interface ParkingLotProps {
  items: BookmarkedItem[];
  onRemove: (id: string, e: React.MouseEvent) => void;
}

export function ParkingLot({ items, onRemove }: ParkingLotProps) {
  const { t } = useLocaleStore();
  if (items.length === 0) {
    return (
      <div className="shrink-0 bg-stone-50 dark:bg-[#111112] border-b border-dashed border-stone-300 dark:border-stone-700 transition-all duration-300">
        <div className="px-4 py-2 flex items-center justify-between opacity-50">
          <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-500 flex items-center gap-1.5">
            <Bookmark className="size-3" />
            {t.feed.parkingLot} <span className="text-stone-400">({0})</span>
          </h2>
          <span className="text-[9px] uppercase tracking-widest text-stone-500">
            {t.feed.pinToSave}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="shrink-0 bg-stone-50 dark:bg-[#111112] border-b border-dashed border-stone-300 dark:border-stone-700 relative overflow-hidden transition-all duration-300">
      <div className="px-4 py-2 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-white/50 dark:bg-black/20">
        <h2 className="text-[10px] font-bold uppercase tracking-widest text-stone-600 dark:text-stone-400 flex items-center gap-1.5">
          <Bookmark className="size-3" />
          {t.feed.parkingLot} <span className="text-stone-400 dark:text-stone-600">({items.length})</span>
        </h2>
        <span className="text-[9px] uppercase font-bold tracking-widest text-amber-600 dark:text-amber-500 flex items-center gap-1">
          <AlertCircle className="size-3" /> {t.feed.autoExpires}
        </span>
      </div>

      <div className="p-3 overflow-x-auto no-scrollbar flex gap-3">
        {items.map(item => (
          <Link
            key={item.id}
            to={`/analysis/${item.id}`}
            className="group flex-shrink-0 w-72 bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-stone-800 rounded p-3 flex flex-col gap-2 relative hover:border-stone-400 dark:hover:border-stone-600 shadow-sm transition-colors"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {(() => { const sc = getSectorColor(item.sector); return (
                  <>
                    <div className={`w-1.5 h-1.5 rounded-full ${item.metrics.urgency === 'critical' || item.metrics.urgency === 'high' ? sc.dot : 'bg-stone-300 dark:bg-stone-700'}`} />
                    <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded ${sc.bg} ${sc.text}`}>
                      {item.sector}
                    </span>
                  </>
                ); })()}
              </div>

              <button
                onClick={(e) => onRemove(item.id, e)}
                className="opacity-0 group-hover:opacity-100 p-1 bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 rounded transition-all absolute top-2 right-2"
              >
                <X className="size-3" />
              </button>
            </div>

            <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200 leading-snug line-clamp-2 pr-6 flex-1 group-hover:text-primary transition-colors">
              {item.headline}
            </h4>

            <div className="mt-auto pt-2 border-t border-stone-100 dark:border-stone-800/50 flex items-center justify-between">
              <span className="text-[10px] font-mono text-stone-400 dark:text-stone-600">
                {item.metrics.confidence}% Conf
              </span>
              <ExpirationBadge expiresAt={item.expiresAt} compact={true} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
