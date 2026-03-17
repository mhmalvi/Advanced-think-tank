import { LayoutDashboard, Globe, Landmark, Cpu, Zap, Activity } from "lucide-react";

const CATEGORIES = [
  { label: "Overview", icon: LayoutDashboard, active: true },
  { label: "Geopolitics", icon: Globe, active: false },
  { label: "Macro & Central Banks", icon: Landmark, active: false },
  { label: "Tech & Semis", icon: Cpu, active: false },
  { label: "Energy & Transition", icon: Zap, active: false },
  { label: "Live Watchlist", icon: Activity, active: false }
];

export function CategoryNav() {
  return (
    <div className="bg-white dark:bg-[#0a0a0b] border-b border-stone-200 dark:border-stone-800 sticky top-0 z-20 shadow-sm">
      <div className="max-w-[1600px] mx-auto px-4">
        <div className="flex items-center overflow-x-auto no-scrollbar gap-1">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              className={`flex items-center gap-1.5 px-3 py-2.5 text-[11px] font-bold uppercase tracking-widest whitespace-nowrap transition-colors border-b-2 ${
                cat.active
                  ? "border-primary text-stone-900 dark:text-stone-100 bg-stone-50 dark:bg-stone-900/50"
                  : "border-transparent text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-900/30"
              }`}
            >
              <cat.icon className={`size-3.5 ${cat.active ? "text-primary" : ""}`} />
              {cat.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
