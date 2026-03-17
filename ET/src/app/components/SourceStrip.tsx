import { Newspaper, PanelRight } from "lucide-react";
import { useLocaleStore } from "@/stores/locale";
import { useAppStore } from "@/stores/app";
import { UserMenu } from "@/app/components/UserMenu";

export function SourceStrip() {
  const { t } = useLocaleStore();
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen);
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar);
  const sources = useAppStore((s) => s.sources);
  const browseSource = useAppStore((s) => s.browseSource);

  return (
    <div className="bg-white dark:bg-[#0a0a0b] border-b border-stone-200 dark:border-[#1C1C1D] px-3 py-1.5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4 w-full">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-stone-500 dark:text-[#5F5F5F]">
          <Newspaper className="size-3.5 text-[#ef4444]" />
          <span>{t.sourceStrip.activeSources}</span>
        </div>
        <div className="flex items-center gap-2 flex-1 overflow-x-auto no-scrollbar">
          {sources.length === 0 ? (
            <span className="text-[11px] text-stone-400 dark:text-stone-600 italic">Loading sources...</span>
          ) : (
            sources.map((source) => (
              <button
                key={source.id}
                onClick={() => browseSource(source)}
                className="flex items-center gap-2 px-2 py-1 rounded border border-stone-200 dark:border-[#1C1C1D] bg-stone-100 dark:bg-[#111112] hover:bg-stone-200 dark:hover:bg-[#1C1C1D] transition-colors shrink-0"
              >
                <span className="text-[11px] font-bold text-stone-700 dark:text-stone-300">{source.name}</span>
                <span className="text-[10px] font-mono text-stone-500 dark:text-[#5F5F5F]">{source.article_count}</span>
              </button>
            ))
          )}
        </div>
        <div className="flex items-center gap-2 ml-2 shrink-0">
          <button
            onClick={toggleRightSidebar}
            className={`flex items-center justify-center h-6 w-6 rounded border border-stone-200 dark:border-[#1C1C1D] transition-all ${
              rightSidebarOpen
                ? "bg-stone-200 dark:bg-[#1C1C1D] text-stone-700 dark:text-stone-200"
                : "bg-stone-100 dark:bg-[#111112] hover:bg-stone-200 dark:hover:bg-[#1C1C1D] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
            }`}
            title={rightSidebarOpen ? "Hide sidebar" : "Show sidebar"}
          >
            <PanelRight className="size-3.5" />
          </button>
          <UserMenu />
        </div>
      </div>
    </div>
  );
}
