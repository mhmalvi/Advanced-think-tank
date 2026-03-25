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
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/app";
import { useStoriesStore } from "@/stores/stories";

interface LeftNavProps {
  collapsed?: boolean;
}

const mainNav = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Sources", path: "/sources", icon: Database },
  { label: "Bookmarks", path: "/bookmarks", icon: Bookmark },
  { label: "History", path: "/history", icon: Clock },
];

export function LeftNav({ collapsed = false }: LeftNavProps) {
  const location = useLocation();
  const toggleLeftNav = useAppStore((s) => s.toggleLeftNav);
  const stories = useStoriesStore((s) => s.stories);

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
          title="Expand sidebar"
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
      </aside>
    );
  }

  // ─── Expanded ───
  return (
    <aside className="w-56 border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-col h-screen shrink-0 transition-all duration-200">
      {/* Header */}
      <div className="p-3 border-b border-stone-200 dark:border-stone-800">
        <div className="flex items-start justify-between">
          <Link to="/" className="mb-2 block">
            <ImageWithFallback
              src="https://images.squarespace-cdn.com/content/v1/6556194e9cc0e30b3030a441/78761e90-5e4a-4a8b-9224-6fdb54cde2c9/Et_Prim%E2%94%9C%C2%AAr_Vertikalt_Logo_Sort_R%E2%94%9C%E2%95%95d_RGB.png?format=1500w"
              alt="Et Primaer Logo"
              className="h-14 w-auto object-contain object-left dark:invert"
            />
          </Link>
          <button
            onClick={toggleLeftNav}
            className="p-1.5 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-400 hover:text-stone-900 dark:hover:text-stone-100 transition-colors mt-1"
            title="Collapse sidebar"
          >
            <PanelLeftClose className="size-4" />
          </button>
        </div>
        <h1 className="font-bold text-black dark:text-white tracking-tight text-sm">Jægeren</h1>
        <p className="text-[10px] text-[#E30613] font-medium mt-0.5">Erhvervslivets Tænketank</p>
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
              <h2 className="text-[11px] font-semibold uppercase tracking-wider">Trending</h2>
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
                        {story.source_count} sources
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
