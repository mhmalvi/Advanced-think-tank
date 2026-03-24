import { Database, Zap, BrainCircuit, Globe } from "lucide-react";
import { useLocaleStore } from "@/stores/locale";
import { useAppStore } from "@/stores/app";

export function IngestionHUD() {
  const { t } = useLocaleStore();
  const sources = useAppStore((s) => s.sources);
  const lastIngestionTime = useAppStore((s) => s.lastIngestionTime);

  const sourceCount = sources.length;

  // Calculate hours since last ingestion
  let cycleDisplay = "2 " + t.hud.hours;
  if (lastIngestionTime) {
    const ageMs = Date.now() - new Date(lastIngestionTime).getTime();
    const ageHours = Math.floor(ageMs / (1000 * 60 * 60));
    const ageMins = Math.floor(ageMs / (1000 * 60));
    if (ageMins < 60) {
      cycleDisplay = `${ageMins}m`;
    } else {
      cycleDisplay = `${ageHours}h`;
    }
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <div className="bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-[#1C1C1D] rounded-xl p-5 flex flex-col justify-between h-[120px]">
        <div className="flex items-start justify-between">
          <div className="p-1.5 bg-stone-100 dark:bg-[#1C1C1D] rounded text-stone-400">
            <Database className="size-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 dark:text-[#5F5F5F]">
            RSS / API
          </span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-stone-900 dark:text-white leading-none tracking-tight mb-1 font-sans">
            {sourceCount || "..."}
          </h3>
          <p className="text-[11px] font-medium text-stone-600 dark:text-[#7D7D82]">{t.hud.sourcesMonitored}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-[#1C1C1D] rounded-xl p-5 flex flex-col justify-between h-[120px]">
        <div className="flex items-start justify-between">
          <div className="p-1.5 bg-stone-100 dark:bg-[#1C1C1D] rounded text-stone-400">
            <Zap className="size-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 dark:text-[#5F5F5F]">
            Automated
          </span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-stone-900 dark:text-white leading-none tracking-tight mb-1 font-sans">
            {cycleDisplay}
          </h3>
          <p className="text-[11px] font-medium text-stone-600 dark:text-[#7D7D82]">{t.hud.updateCycle}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-[#1C1C1D] rounded-xl p-5 flex flex-col justify-between h-[120px]">
        <div className="flex items-start justify-between">
          <div className="p-1.5 bg-stone-100 dark:bg-[#1C1C1D] rounded text-stone-400">
            <BrainCircuit className="size-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 dark:text-[#5F5F5F]">
            RAG + Synthesis
          </span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-stone-900 dark:text-white leading-none tracking-tight mb-1 font-sans">
            Claude AI
          </h3>
          <p className="text-[11px] font-medium text-stone-600 dark:text-[#7D7D82]">{t.hud.analysisEngine}</p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-[#1C1C1D] rounded-xl p-5 flex flex-col justify-between h-[120px]">
        <div className="flex items-start justify-between">
          <div className="p-1.5 bg-stone-100 dark:bg-[#1C1C1D] rounded text-stone-400">
            <Globe className="size-4" />
          </div>
          <span className="text-[9px] font-bold uppercase tracking-widest text-stone-500 dark:text-[#5F5F5F]">
            Global
          </span>
        </div>
        <div>
          <h3 className="text-2xl font-bold text-stone-900 dark:text-white leading-none tracking-tight mb-1 font-sans">
            24/7
          </h3>
          <p className="text-[11px] font-medium text-stone-600 dark:text-[#7D7D82]">{t.hud.globalCoverage}</p>
        </div>
      </div>
    </div>
  );
}
