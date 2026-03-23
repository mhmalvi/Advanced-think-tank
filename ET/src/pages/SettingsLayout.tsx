import { Outlet, Link, useLocation } from "react-router-dom";
import { ArrowLeft, User, Brain, Building2 } from "lucide-react";
import { useLocaleStore } from "@/stores/locale";

export function SettingsLayout() {
  const location = useLocation();
  const { t } = useLocaleStore();

  const tabs = [
    { key: "profile", path: "/settings/profile", icon: User, label: t.settings.profile },
    { key: "ai-profile", path: "/settings/ai-profile", icon: Brain, label: "AI Profile" },
    { key: "company", path: "/settings/company", icon: Building2, label: t.settings.organization },
  ];

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 px-6 pt-4 pb-0">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-white transition-colors mb-4"
        >
          <ArrowLeft className="size-4" />
          {t.settings.backToDashboard}
        </Link>

        <div className="flex gap-1">
          {tabs.map((tab) => {
            const isActive = location.pathname.includes(tab.path);
            return (
              <Link
                key={tab.key}
                to={tab.path}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-[#E30613] text-[#E30613] dark:text-[#ff4444]"
                    : "border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:border-stone-300"
                }`}
              >
                <tab.icon className="size-4" />
                {tab.label}
              </Link>
            );
          })}
        </div>
      </div>

      <main className="flex-1 overflow-y-auto p-6 md:p-8">
        <Outlet />
      </main>
    </div>
  );
}
