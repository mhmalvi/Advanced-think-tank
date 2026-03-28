import {
  TrendingUp,
  Newspaper,
  Activity,
  CheckCircle,
  AlertTriangle,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { useMemo } from "react";
import { SimulationPulse } from "@/app/components/simulation/SimulationPulse";
import { useLocaleStore } from "@/stores/locale";
import { useAppStore } from "@/stores/app";
import { relativeTime } from "@/lib/utils";
import { HEALTH_THRESHOLD_MS, MAX_RECENT_ITEMS } from "@/lib/constants";

function timeSince(dateStr: string, t: ReturnType<typeof useLocaleStore.getState>["t"]): string {
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return "—";
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.time.justNow;
  if (mins < 60) return t.time.minutesAgo.replace("{n}", String(mins));
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t.time.hoursAgo.replace("{n}", String(hours));
  return t.time.daysAgo.replace("{n}", String(Math.floor(hours / 24)));
}

interface RightSidebarProps {
  collapsed?: boolean;
}

export function RightSidebar({ collapsed = false }: RightSidebarProps) {
  const t = useLocaleStore((s) => s.t);
  const sources = useAppStore((s) => s.sources);
  const recentArticles = useAppStore((s) => s.recentArticles);
  const queryCountToday = useAppStore((s) => s.queryCountToday);
  const submitQuery = useAppStore((s) => s.submitQuery);
  const closeAllPanels = useAppStore((s) => s.closeAllPanels);
  const lastIngestionTime = useAppStore((s) => s.lastIngestionTime);
  const totalArticleCount = useAppStore((s) => s.totalArticleCount);
  const toggleRightSidebar = useAppStore((s) => s.toggleRightSidebar);

  const isHealthy = useMemo(
    () => (lastIngestionTime ? Date.now() - new Date(lastIngestionTime).getTime() < HEALTH_THRESHOLD_MS : false),
    [lastIngestionTime],
  );

  const handleQuery = (text: string) => {
    closeAllPanels();
    submitQuery(text);
  };

  const topSources = sources
    .filter((s) => s.article_count > 0)
    .sort((a, b) => b.article_count - a.article_count)
    .slice(0, MAX_RECENT_ITEMS);

  const latestArticles = recentArticles.slice(0, MAX_RECENT_ITEMS);

  // ─── Collapsed ───
  if (collapsed) {
    return (
      <aside className="w-14 border-l border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-col h-screen shrink-0 items-center py-3 gap-1 transition-all duration-200">
        <button
          onClick={toggleRightSidebar}
          className="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-2"
          title={t.navLabels?.expandSidebar ?? "Expand sidebar"}
        >
          <PanelRightOpen className="size-4" />
        </button>

        <div
          className={`p-2 rounded transition-colors ${isHealthy ? "text-green-600" : "text-amber-500"}`}
          title={isHealthy ? t.sidebar.healthy : t.sidebar.degraded}
        >
          <Activity className="size-4" />
        </div>
        <div className="p-2 rounded text-stone-500" title={t.sidebar.latestArticles}>
          <Newspaper className="size-4" />
        </div>
        <div className="p-2 rounded text-stone-500" title={t.sidebar.topSources}>
          <TrendingUp className="size-4" />
        </div>
      </aside>
    );
  }

  // ─── Expanded ───
  return (
    <aside className="w-56 border-l border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-col h-screen shrink-0 transition-all duration-200">
      {/* Header */}
      <div className="p-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-bold text-black dark:text-white tracking-tight text-sm">
              {t.navLabels?.insights ?? "Insights"}
            </h2>
            <p className="text-[10px] text-[#E30613] font-medium mt-0.5">
              {t.navLabels?.systemIntelligence ?? "System & intelligence"}
            </p>
          </div>
          <button
            onClick={toggleRightSidebar}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mt-1"
            title={t.navLabels?.collapseSidebar ?? "Collapse sidebar"}
          >
            <PanelRightClose className="size-4" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {/* System Health Monitor */}
        <div className="mb-4 p-2.5 rounded border-l-2 border-[#E30613] border-y border-r border-y-stone-200 border-r-stone-200 dark:border-y-stone-700 dark:border-r-stone-700 bg-white dark:bg-stone-950">
          <div className="flex items-center gap-1.5 mb-2">
            <Activity className="size-3.5 text-stone-700 dark:text-stone-300" />
            <h3 className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wide">
              {t.sidebar.systemHealth}
            </h3>
          </div>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-stone-600 dark:text-stone-400">{t.sidebar.pipelineStatus}</span>
              <div className="flex items-center gap-1">
                {isHealthy ? (
                  <>
                    <CheckCircle className="size-2.5 text-green-600" />
                    <span className="text-[10px] font-bold text-green-600">{t.sidebar.healthy}</span>
                  </>
                ) : (
                  <>
                    <AlertTriangle className="size-2.5 text-amber-500" />
                    <span className="text-[10px] font-bold text-amber-500">{t.sidebar.degraded}</span>
                  </>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-stone-600 dark:text-stone-400">{t.sidebar.lastIngestion}</span>
              <span className="text-[10px] font-bold text-black dark:text-white">
                {lastIngestionTime ? timeSince(lastIngestionTime, t) : t.sidebar.neverRun}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-stone-600 dark:text-stone-400">{t.sidebar.vectorCount}</span>
              <span className="text-[10px] font-bold text-black dark:text-white">
                {totalArticleCount.toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Latest Articles */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Newspaper className="size-3.5 text-stone-700 dark:text-stone-300" />
            <h3 className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wide">
              {t.sidebar.latestArticles}
            </h3>
          </div>
          <div className="space-y-1">
            {latestArticles.length > 0 ? (
              latestArticles.map((article) => (
                <a
                  key={article.id}
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-left px-2 py-1.5 text-[11px] border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-500 bg-white dark:bg-stone-900 rounded transition-colors"
                >
                  <span className="line-clamp-2 text-stone-700 dark:text-stone-300 leading-snug">{article.title}</span>
                  <div className="flex items-center gap-2 text-[10px] text-stone-400 mt-0.5">
                    <span>{article.source_name}</span>
                    {article.published_at && (
                      <>
                        <span>&bull;</span>
                        <span>{relativeTime(article.published_at)}</span>
                      </>
                    )}
                  </div>
                </a>
              ))
            ) : (
              <p className="text-[10px] text-stone-400 italic px-2 py-1">{t.common.loading}</p>
            )}
          </div>
        </div>

        {/* Top Sources */}
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="size-3.5 text-stone-700 dark:text-stone-300" />
            <h3 className="text-[11px] font-bold text-black dark:text-white uppercase tracking-wide">
              {t.sidebar.topSources}
            </h3>
          </div>
          <div className="space-y-1">
            {topSources.map((source) => (
              <button
                key={source.id}
                onClick={() => handleQuery(t.sidebar.latestNewsFrom.replace("{name}", source.name))}
                className="w-full text-left px-2 py-1.5 rounded border border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-500 transition-colors flex items-center justify-between bg-white dark:bg-stone-900"
              >
                <span className="text-[11px] font-medium text-stone-700 dark:text-stone-300 truncate">
                  {source.name}
                </span>
                <span className="text-[10px] font-bold text-[#E30613] shrink-0 ml-2">{source.article_count}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Quick Stats */}
        <div className="mb-4 p-2.5 bg-white dark:bg-stone-950 rounded border border-stone-200 dark:border-stone-700">
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                {t.sidebar.queriesToday}
              </span>
              <span className="text-xs font-bold text-black dark:text-white">{queryCountToday}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                {t.sidebar.monitoredSources}
              </span>
              <span className="text-xs font-bold text-black dark:text-white">{sources.length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[10px] text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                {t.sidebar.newArticles}
              </span>
              <span className="text-xs font-bold text-black dark:text-white">{totalArticleCount.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Simulation Pulse */}
        <SimulationPulse />
      </div>
    </aside>
  );
}
