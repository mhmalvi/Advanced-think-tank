import {
  LayoutDashboard,
  Database,
  Bookmark,
  PanelLeftClose,
  PanelLeftOpen,
  TrendingUp,
  Clock,
  Newspaper,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/app";
import { useStoriesStore } from "@/stores/stories";
import { useLocaleStore } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { supabase } from "@/lib/supabase";
import { SimulationSection } from "@/app/components/simulation/SimulationSection";

function RecentSessions() {
  const user = useAuthStore((s) => s.user);
  const [sessions, setSessions] = useState<{ id: string; story_id: string; title: string; updated_at: string }[]>([]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("canvas_sessions")
      .select("id, story_id, updated_at, stories(title)")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(5)
      .then(({ data }) => {
        if (data) {
          setSessions(
            data.map((s: any) => ({
              id: s.id,
              story_id: s.story_id,
              title: s.stories?.title || "Untitled",
              updated_at: s.updated_at,
            })),
          );
        }
      });
  }, [user]);

  if (sessions.length === 0) return null;

  const timeAgo = (d: string) => {
    const ms = Date.now() - new Date(d).getTime();
    const m = Math.floor(ms / 60000);
    if (m < 60) return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  return (
    <div className="mb-4">
      <div className="flex items-center gap-2 px-1 mb-1.5 text-stone-900 dark:text-stone-100">
        <Clock className="size-3.5" />
        <h2 className="text-[11px] font-semibold uppercase tracking-wider">Recent</h2>
      </div>
      <ul className="space-y-0.5">
        {sessions.map((s) => (
          <li key={s.id}>
            <Link
              to={`/canvas/${s.story_id}?session=${s.id}`}
              className="w-full text-left px-2 py-1.5 text-xs text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 rounded flex items-start gap-2 transition-colors"
            >
              <div className="min-w-0 flex-1">
                <span className="line-clamp-1 leading-tight">{s.title}</span>
                <span className="text-[10px] text-stone-400 dark:text-stone-600 block">{timeAgo(s.updated_at)}</span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

interface LeftNavProps {
  collapsed?: boolean;
}

export function LeftNav({ collapsed = false }: LeftNavProps) {
  const location = useLocation();
  const toggleLeftNav = useAppStore((s) => s.toggleLeftNav);
  const stories = useStoriesStore((s) => s.stories);
  const t = useLocaleStore((s) => s.t);

  const mainNav = [
    { label: t.navLabels.dashboard, path: "/dashboard", icon: LayoutDashboard },
    { label: t.navLabels.sources, path: "/sources", icon: Database },
    { label: t.navLabels.bookmarks, path: "/bookmarks", icon: Bookmark },
    { label: t.navLabels.history, path: "/history", icon: Clock },
  ];

  // Top 5 stories by source_count for "Trending"
  const trending = [...stories].sort((a, b) => b.source_count - a.source_count).slice(0, 5);

  const isNavActive = (path: string) => {
    if (path === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(path);
  };

  // ─── Collapsed ───
  if (collapsed) {
    return (
      <aside className="w-14 border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-col h-screen shrink-0 items-center py-3 gap-1 transition-all duration-200">
        <button
          onClick={toggleLeftNav}
          className="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mb-2"
          title={t.navLabels.expandSidebar}
        >
          <PanelLeftOpen className="size-4" />
        </button>

        {mainNav.map((item) => {
          const active = isNavActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`p-2 rounded transition-colors ${
                active
                  ? "bg-[#E30613]/10 text-[#E30613] dark:text-[#ff4444]"
                  : "text-stone-500 hover:text-[#E30613] dark:hover:text-[#ff4444] hover:bg-stone-100 dark:hover:bg-stone-800"
              }`}
            >
              <item.icon className="size-4" />
            </Link>
          );
        })}
        <SimulationSection collapsed />
      </aside>
    );
  }

  // ─── Expanded ───
  return (
    <aside className="w-56 border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-col h-screen shrink-0 transition-all duration-200">
      {/* Header */}
      <div className="p-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-start justify-between">
          <Link to="/" className="block">
            <img
              src="/logo.svg"
              alt="Advanced Think Tank by Aethon"
              className="h-12 w-auto object-contain object-left dark:invert"
            />
          </Link>
          <button
            onClick={toggleLeftNav}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mt-1"
            title={t.navLabels.collapseSidebar}
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        {/* Main navigation */}
        <div className="mb-4 space-y-1">
          {mainNav.map((item) => {
            const active = isNavActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
                  active
                    ? "bg-[#E30613]/10 text-[#E30613] dark:text-[#ff4444] font-medium border-l-2 border-[#E30613] -ml-[2px] pl-[calc(0.5rem+2px)]"
                    : "text-stone-700 dark:text-stone-300 hover:text-[#E30613] dark:hover:text-[#ff4444] hover:bg-stone-100 dark:hover:bg-stone-800"
                }`}
              >
                <item.icon className="size-3.5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Trending stories */}
        {trending.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 px-1 mb-1.5 text-stone-900 dark:text-stone-100">
              <TrendingUp className="size-3.5" />
              <h2 className="text-[11px] font-semibold uppercase tracking-wider">{t.navLabels.trending}</h2>
            </div>
            <ul className="space-y-0.5">
              {trending.map((story) => (
                <li key={story.id}>
                  <Link
                    to={`/canvas/${story.id}`}
                    className="w-full text-left px-2 py-1.5 text-xs text-stone-600 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 rounded flex items-start gap-2 group transition-colors"
                  >
                    <Newspaper className="size-3 mt-0.5 shrink-0 text-stone-400 dark:text-stone-600 group-hover:text-stone-600 dark:group-hover:text-stone-300" />
                    <div className="min-w-0 flex-1">
                      <span className="line-clamp-2 leading-tight">{story.title}</span>
                      <span className="text-[10px] text-stone-400 dark:text-stone-600 mt-0.5 block">
                        {story.source_count} {t.dashboard?.sources ?? "sources"}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recent canvas sessions */}
        <RecentSessions />

        {/* Simulation intelligence */}
        <SimulationSection />
      </nav>
    </aside>
  );
}
