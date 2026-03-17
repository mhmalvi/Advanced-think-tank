import { HelpCircle, TrendingUp } from "lucide-react";
import { useAppStore } from "@/stores/app";

export function RightSidebar() {
  const recentQueries = useAppStore((s) => s.recentQueries);
  const sources = useAppStore((s) => s.sources);
  const queryCountToday = useAppStore((s) => s.queryCountToday);
  const totalArticleCount = useAppStore((s) => s.totalArticleCount);
  const submitQuery = useAppStore((s) => s.submitQuery);

  // Show recent query texts as "key questions"
  const recentQueryTexts = recentQueries.slice(0, 5).map((q) => q.query_text);

  // Top sources by article count as "trending"
  const topSources = [...sources]
    .sort((a, b) => b.article_count - a.article_count)
    .slice(0, 3);

  return (
    <aside className="w-64 border-l border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-950 flex flex-col h-screen overflow-y-auto">
      <div className="p-3">
        <div className="mb-4 text-stone-700 dark:text-stone-300">
          <div className="flex items-center gap-1.5 mb-2">
            <HelpCircle className="size-3.5 text-stone-500" />
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide">Recent Queries</h3>
          </div>
          <div className="space-y-1.5">
            {recentQueryTexts.length === 0 ? (
              <p className="text-[11px] text-stone-400 italic px-2 py-1.5">No queries yet</p>
            ) : (
              recentQueryTexts.map((question, index) => (
                <button
                  key={index}
                  onClick={() => submitQuery(question)}
                  className="w-full text-left px-2 py-1.5 text-[11px] font-medium text-stone-700 dark:text-stone-300
                    bg-white dark:bg-stone-900
                    border border-stone-200 dark:border-stone-800
                    hover:bg-stone-100 dark:hover:bg-stone-800 hover:border-stone-300 dark:hover:border-stone-600
                    rounded transition-all duration-200 flex items-start gap-1.5 group"
                >
                  <div className="mt-0.5 shrink-0 w-3 h-3 rounded-full bg-stone-200 dark:bg-stone-800 flex items-center justify-center group-hover:bg-stone-300 dark:group-hover:bg-stone-500 transition-colors">
                     <div className="w-1 h-1 rounded-full bg-stone-400 dark:bg-stone-500 group-hover:bg-stone-600 dark:group-hover:bg-stone-900 transition-colors" />
                  </div>
                  <span className="leading-snug flex-1 line-clamp-2">{question}</span>
                </button>
              ))
            )}
          </div>
        </div>

        <div>
          <div className="flex items-center gap-1.5 mb-2 text-stone-700 dark:text-stone-300">
            <TrendingUp className="size-3.5 text-stone-500" />
            <h3 className="text-xs font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wide">Top Sources</h3>
          </div>
          <div className="space-y-1.5">
            {topSources.length === 0 ? (
              <p className="text-[11px] text-stone-400 italic px-2">Loading...</p>
            ) : (
              topSources.map((source) => (
                <button
                  key={source.id}
                  className="w-full text-left p-1.5 rounded border border-stone-200 dark:border-stone-800 hover:border-stone-300 dark:hover:border-stone-500 transition-colors flex items-center justify-between group bg-white dark:bg-stone-900"
                >
                  <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 group-hover:text-stone-900 dark:group-hover:text-stone-100 truncate">
                    {source.name}
                  </span>
                  <span className="text-[10px] font-bold text-[#E94E3D] shrink-0 ml-2">
                    {source.article_count}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="mt-4 p-2.5 bg-white dark:bg-stone-900 rounded border border-stone-200 dark:border-stone-800">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Queries Today</span>
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{queryCountToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Monitored Sources</span>
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{sources.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">Total Articles</span>
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100">{totalArticleCount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
