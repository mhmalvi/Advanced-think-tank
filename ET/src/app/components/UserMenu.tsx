import { useState, useEffect, useRef } from "react";
import { Sun, Moon, Monitor, Check, Settings, LogOut, Globe, Type, Keyboard } from "lucide-react";
import { useTheme } from "next-themes";
import { Link, useNavigate } from "react-router-dom";
import { useLocaleStore, type Locale } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, locale, setLocale } = useLocaleStore();
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const signOut = useAuthStore((s) => s.signOut);
  const textSize = useSettingsStore((s) => s.textSize);
  const setTextSize = useSettingsStore((s) => s.setTextSize);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  const displayName = profile?.full_name || user?.email?.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const themeOptions = mounted
    ? [
        { value: "light", icon: Sun, label: "Light" },
        { value: "dark", icon: Moon, label: "Dark" },
        { value: "system", icon: Monitor, label: "Auto" },
      ]
    : [];

  const textSizeOptions = [
    { value: "sm" as const, label: "Small", preview: "text-[10px]" },
    { value: "md" as const, label: "Medium", preview: "text-[11px]" },
    { value: "lg" as const, label: "Large", preview: "text-xs" },
  ];

  const languages: { value: Locale; label: string; flag: string }[] = [
    { value: "en", label: "English", flag: "EN" },
    { value: "da", label: "Dansk", flag: "DA" },
  ];

  const handleSignOut = async () => {
    setOpen(false);
    await signOut();
    navigate("/");
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 py-1 px-1.5 rounded-lg transition-all duration-150 ${
          open ? "bg-stone-100 dark:bg-stone-800" : "hover:bg-stone-50 dark:hover:bg-stone-800"
        }`}
        title="User menu"
      >
        <div className="size-7 rounded-full bg-gradient-to-br from-[#E30613] to-[#900] dark:from-[#E30613] dark:to-[#ff4444] flex items-center justify-center shadow-sm">
          <span className="text-[10px] font-bold text-white dark:text-stone-900 leading-none">{initials}</span>
        </div>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1.5 w-60 bg-white dark:bg-[#111113] border border-stone-200 dark:border-stone-800 rounded-xl shadow-2xl dark:shadow-black/40 z-50 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* User card */}
          <div className="px-4 py-3 bg-gradient-to-r from-stone-50 to-stone-100 dark:from-stone-900 dark:to-stone-900/50 border-b border-stone-200 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-full bg-gradient-to-br from-[#E30613] to-[#900] dark:from-[#E30613] dark:to-[#ff4444] flex items-center justify-center shadow-md">
                <span className="text-xs font-bold text-white dark:text-stone-900">{initials}</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">{displayName}</p>
                {user?.email && <p className="text-[10px] text-stone-500 dark:text-stone-400 truncate">{user.email}</p>}
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="px-3 py-2.5 border-b border-stone-100 dark:border-stone-800/50">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 mb-2">
              Appearance
            </p>
            <div className="flex gap-1 bg-stone-100 dark:bg-stone-800/50 rounded-lg p-0.5">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                    }`}
                  >
                    <Icon className="size-3" />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Size */}
          <div className="px-3 py-2.5 border-b border-stone-100 dark:border-stone-800/50">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 mb-2 flex items-center gap-1">
              <Type className="size-2.5" /> Text Size
            </p>
            <div className="flex gap-1 bg-stone-100 dark:bg-stone-800/50 rounded-lg p-0.5">
              {textSizeOptions.map((opt) => {
                const isActive = textSize === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTextSize(opt.value)}
                    className={`flex-1 flex items-center justify-center px-2 py-1.5 rounded-md font-medium transition-all duration-150 ${opt.preview} ${
                      isActive
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div className="px-3 py-2.5 border-b border-stone-100 dark:border-stone-800/50">
            <p className="text-[9px] font-semibold uppercase tracking-[0.12em] text-stone-400 dark:text-stone-500 mb-2 flex items-center gap-1">
              <Globe className="size-2.5" /> Language
            </p>
            <div className="flex gap-1 bg-stone-100 dark:bg-stone-800/50 rounded-lg p-0.5">
              {languages.map((lang) => {
                const isActive = locale === lang.value;
                return (
                  <button
                    key={lang.value}
                    onClick={() => setLocale(lang.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm"
                        : "text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300"
                    }`}
                  >
                    {isActive && <Check className="size-2.5" />}
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shortcuts hint */}
          <div className="px-3 py-2 border-b border-stone-100 dark:border-stone-800/50">
            <div className="flex items-center justify-between text-[10px] text-stone-400 dark:text-stone-500">
              <span className="flex items-center gap-1">
                <Keyboard className="size-2.5" /> Search
              </span>
              <kbd className="px-1.5 py-0.5 rounded bg-stone-100 dark:bg-stone-800 text-[9px] font-mono font-medium text-stone-500 dark:text-stone-400 border border-stone-200 dark:border-stone-700">
                Ctrl+K
              </kbd>
            </div>
          </div>

          {/* Actions */}
          <div className="py-1">
            <Link
              to="/settings"
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2.5"
            >
              <Settings className="size-3.5 text-stone-400" />
              {t.common.settings}
            </Link>
            <button
              onClick={handleSignOut}
              className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-2.5"
            >
              <LogOut className="size-3.5" />
              {t.common.logOut}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
