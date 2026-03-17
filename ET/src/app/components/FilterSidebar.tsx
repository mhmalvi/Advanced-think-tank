import { Filter, Eye, Hash, TrendingUp, AlertOctagon } from "lucide-react";

export function FilterSidebar() {
  const urgencyLevels = [
    { label: "Critical", count: 7, color: "text-red-500", bg: "bg-red-500" },
    { label: "High", count: 32, color: "text-orange-500", bg: "bg-orange-500" },
    { label: "Medium", count: 124, color: "text-amber-500", bg: "bg-amber-500" },
    { label: "Low", count: 89, color: "text-stone-500", bg: "bg-stone-500" }
  ];

  const assetClasses = ["Equities", "FX", "Commodities", "Fixed Income", "Crypto"];
  const entities = ["Nvidia", "FED", "TSMC", "China", "ECB", "OpenAI"];

  return (
    <div className="h-full bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded shadow-sm flex flex-col overflow-hidden">
      <div className="p-3 border-b border-stone-200 dark:border-stone-800 flex items-center justify-between bg-stone-50 dark:bg-stone-950/50">
        <h2 className="text-xs font-bold uppercase tracking-widest text-stone-900 dark:text-stone-100 flex items-center gap-1.5">
          <Filter className="size-3.5" /> Triage Filters
        </h2>
        <button className="text-[10px] font-bold text-stone-500 hover:text-primary transition-colors uppercase tracking-wider">
          Reset
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        <div>
          <label className="flex items-center gap-2 cursor-pointer group">
            <div className="relative">
               <input type="checkbox" className="sr-only" defaultChecked />
               <div className="block bg-stone-200 dark:bg-stone-800 w-8 h-4 rounded-full transition-colors group-hover:bg-stone-300 dark:group-hover:bg-stone-700"></div>
               <div className="dot absolute left-1 top-1 bg-white dark:bg-stone-400 w-2 h-2 rounded-full transition-transform transform translate-x-4 bg-primary dark:bg-primary"></div>
            </div>
            <span className="text-[11px] font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider flex items-center gap-1.5">
              <Eye className="size-3.5 text-stone-500" /> Show Unread Only
            </span>
          </label>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <AlertOctagon className="size-3" /> Urgency Level
          </h3>
          <div className="space-y-1">
            {urgencyLevels.map((level) => (
              <label key={level.label} className="flex items-center justify-between p-1.5 hover:bg-stone-50 dark:hover:bg-stone-800 rounded cursor-pointer group transition-colors">
                <div className="flex items-center gap-2">
                  <input type="checkbox" className="rounded border-stone-300 dark:border-stone-700 text-primary focus:ring-primary bg-transparent size-3" defaultChecked={level.label === "Critical" || level.label === "High"} />
                  <span className={`text-[11px] font-bold uppercase tracking-wider ${level.color}`}>{level.label}</span>
                </div>
                <span className="text-[9px] font-mono text-stone-500 bg-stone-100 dark:bg-stone-950 px-1.5 py-0.5 rounded border border-stone-200 dark:border-stone-800 group-hover:border-stone-300 dark:group-hover:border-stone-700">
                  {level.count}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <Hash className="size-3" /> Asset Class
          </h3>
          <div className="flex flex-wrap gap-1.5">
             {assetClasses.map(asset => (
               <button key={asset} className="px-2 py-1 text-[10px] font-medium text-stone-600 dark:text-stone-300 bg-white dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded hover:border-primary dark:hover:border-primary hover:text-primary transition-colors">
                 {asset}
               </button>
             ))}
          </div>
        </div>

        <div>
          <h3 className="text-[10px] font-bold text-stone-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
            <TrendingUp className="size-3" /> Trending Entities
          </h3>
          <div className="flex flex-wrap gap-1.5">
             {entities.map(entity => (
               <button key={entity} className="px-2 py-1 text-[10px] font-medium text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-800 rounded hover:border-stone-400 dark:hover:border-stone-500 transition-colors">
                 {entity}
               </button>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
