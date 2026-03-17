import { BookmarkCheck, Database, ChevronRight, LayoutDashboard, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import { Link, useLocation } from "react-router-dom";
import { useAppStore } from "@/stores/app";
import { useSavedQueries, useSources } from "@/hooks/useQueries";

interface LeftNavProps {
  collapsed?: boolean;
}

export function LeftNav({ collapsed = false }: LeftNavProps) {
  const location = useLocation();
  const toggleLeftNav = useAppStore((s) => s.toggleLeftNav);
  const { data: savedQueries } = useSavedQueries();
  const { data: sources } = useSources();

  const mainNav = [
    { label: "Command Center", path: "/dashboard", icon: LayoutDashboard },
  ];

  const savedQueryItems = (savedQueries ?? []).slice(0, 5).map((q) => q.query_text);
  const topSources = (sources ?? []).slice(0, 5).map((s) => s.name);

  const navSections = [
    {
      title: "Saved Queries",
      icon: BookmarkCheck,
      items: savedQueryItems.length > 0 ? savedQueryItems : ["No saved queries"],
    },
    {
      title: "Sources",
      icon: Database,
      items: topSources.length > 0 ? topSources : ["No sources"],
    },
  ];

  if (collapsed) {
    return (
      <aside className="w-14 border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-col h-screen shrink-0 items-center py-3 gap-3 transition-all duration-200">
        <button
          onClick={toggleLeftNav}
          className="p-2 rounded hover:bg-stone-200 dark:hover:bg-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 transition-colors"
          title="Expand sidebar"
        >
          <PanelLeftOpen className="size-4" />
        </button>

        <div className="flex-1 flex flex-col items-center gap-1 mt-2">
          {mainNav.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={`p-2 rounded transition-colors ${
                  isActive
                    ? "bg-stone-200 dark:bg-stone-800 text-black dark:text-white"
                    : "text-stone-500 hover:text-black dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800"
                }`}
              >
                <item.icon className="size-4" />
              </Link>
            );
          })}
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 border-r border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900 flex flex-col h-screen shrink-0 transition-all duration-200">
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
        <h1 className="font-bold text-black dark:text-white tracking-tight text-sm">Jaegeren</h1>
        <p className="text-[10px] text-stone-600 dark:text-stone-400 mt-0.5">Geo-economic intelligence</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-2">
        <div className="mb-4">
          <div className="space-y-1">
            {mainNav.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`w-full text-left px-2 py-1.5 text-xs rounded flex items-center gap-2 transition-colors ${
                    isActive
                      ? "bg-stone-200 dark:bg-stone-800 text-black dark:text-white font-medium"
                      : "text-stone-700 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800"
                  }`}
                >
                  <item.icon className="size-3.5" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {navSections.map((section) => (
          <div key={section.title} className="mb-4">
            <div className="flex items-center gap-2 px-1 mb-1 text-stone-900 dark:text-stone-100">
              <section.icon className="size-3.5" />
              <h2 className="text-sm font-medium">{section.title}</h2>
            </div>
            <ul className="space-y-1">
              {section.items.map((item) => (
                <li key={item}>
                  <Link to="/dashboard" className="w-full text-left px-2 py-1 text-xs text-stone-700 dark:text-stone-300 hover:text-black dark:hover:text-white hover:bg-stone-200 dark:hover:bg-stone-800 rounded flex items-center justify-between group transition-colors">
                    <span>{item}</span>
                    <ChevronRight className="size-3 text-stone-400 dark:text-stone-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}
