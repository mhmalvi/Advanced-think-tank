import { Link } from "react-router-dom";
import { Activity, ShieldAlert, Zap, Pin, Share2, XSquare } from "lucide-react";

export interface SynthesisData {
  id: string;
  headline: string;
  tldr: string;
  sector: string;
  region: string;
  entities: string[];
  metrics: {
    sourceCount: number;
    confidence: number;
    urgency: "low" | "medium" | "high" | "critical";
  };
  timestamp: string;
  imageUrl?: string;
}

export function SynthesisCard({ data, isHero = false }: { data: SynthesisData, isHero?: boolean }) {
  const getUrgencyColor = (level: string) => {
    switch (level) {
      case "critical": return "bg-red-500/10 text-red-500 border-red-500/20";
      case "high": return "bg-orange-500/10 text-orange-500 border-orange-500/20";
      case "medium": return "bg-amber-500/10 text-amber-500 border-amber-500/20";
      case "low": return "bg-stone-500/10 text-stone-500 border-stone-500/20";
      default: return "bg-stone-500/10 text-stone-500 border-stone-500/20";
    }
  };

  return (
    <div className="relative group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded hover:border-stone-300 dark:hover:border-stone-600 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col h-full overflow-hidden">
      <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10 bg-white/90 dark:bg-stone-900/90 backdrop-blur-sm p-1 rounded-sm border border-stone-200 dark:border-stone-700">
        <button className="p-1 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors" title="Pin to Workspace">
          <Pin className="size-3.5" />
        </button>
        <button className="p-1 text-stone-500 hover:text-primary transition-colors" title="Share Synthesis">
          <Share2 className="size-3.5" />
        </button>
        <button className="p-1 text-stone-500 hover:text-red-500 transition-colors" title="Dismiss">
          <XSquare className="size-3.5" />
        </button>
      </div>

      <Link to={`/analysis/${data.id}`} className={`flex h-full ${isHero ? 'flex-col md:flex-row' : 'flex-col'}`}>
        {data.imageUrl && (
          <div className={`${isHero ? 'w-full md:w-[40%] md:border-r' : 'w-full border-b'} border-stone-200 dark:border-stone-800 shrink-0 relative overflow-hidden bg-stone-100 dark:bg-stone-950`}>
            <div className={`${isHero ? 'aspect-video md:aspect-square lg:aspect-[4/3]' : 'aspect-video'}`}>
               <img
                 src={data.imageUrl}
                 alt=""
                 className="absolute inset-0 w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity duration-300 group-hover:scale-105"
                 loading="lazy"
               />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
          </div>
        )}

        <div className={`flex flex-col flex-1 ${isHero ? 'p-6' : 'p-3'}`}>
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[10px] font-bold uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {data.sector}
              </span>
              <span className="text-stone-300 dark:text-stone-700">&bull;</span>
              <span className="text-[10px] font-medium uppercase tracking-wider text-stone-500 dark:text-stone-400">
                {data.region}
              </span>
            </div>
            <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-widest border ${getUrgencyColor(data.metrics.urgency)} flex items-center gap-1 shrink-0`}>
              {data.metrics.urgency === "critical" ? <Zap className="size-2.5" /> : null}
              {data.metrics.urgency}
            </div>
          </div>

          <div className="mb-4 flex-1">
            <h3 className={`${isHero ? 'text-2xl mb-3' : 'text-sm mb-1.5'} font-bold text-stone-900 dark:text-stone-100 leading-snug group-hover:text-primary transition-colors line-clamp-3`}>
              {data.headline}
            </h3>
            <p className={`${isHero ? 'text-sm leading-relaxed' : 'text-xs leading-tight'} text-stone-700 dark:text-stone-400 line-clamp-3`}>
              {data.tldr}
            </p>
          </div>

          <div className="flex flex-wrap gap-1.5 mb-4">
            {data.entities.map(entity => (
              <span key={entity} className="px-1.5 py-0.5 bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 text-[10px] font-medium text-stone-600 dark:text-stone-300 rounded cursor-pointer hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors">
                {entity}
              </span>
            ))}
          </div>

          <div className="mt-auto pt-3 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500" title={`${data.metrics.sourceCount} Synthesized Sources`}>
                <Activity className="size-3.5" />
                <span className="font-mono font-medium">{data.metrics.sourceCount}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-stone-500" title={`Confidence Level: ${data.metrics.confidence}%`}>
                <ShieldAlert className="size-3.5 text-primary/80" />
                <span className="font-mono font-medium">{data.metrics.confidence}%</span>
              </div>
            </div>
            <div className="text-[10px] font-medium text-stone-400 uppercase tracking-wider">
              {data.timestamp}
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
