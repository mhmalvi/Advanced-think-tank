import { useState, useEffect, useRef } from "react";
import { Sun, Moon, Monitor, Check, Settings, LogOut, Globe, Type } from "lucide-react";
import { useTheme } from "next-themes";
import { Link } from "react-router-dom";
import { useLocaleStore, type Locale } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { useSettingsStore } from "@/stores/settings";

export function UserMenu() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const { t, locale, setLocale } = useLocaleStore();
  const user = useAuthStore((s) => s.user);
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

  const initials = user?.email
    ? user.email.substring(0, 2).toUpperCase()
    : "??";

  const themeOptions = mounted
    ? [
        { value: "light", label: t.common.themeLight, icon: Sun },
        { value: "dark", label: t.common.themeDark, icon: Moon },
        { value: "system", label: t.common.themeSystem, icon: Monitor },
      ]
    : [];

  const languages: { value: Locale; label: string }[] = [
    { value: "en", label: "English" },
    { value: "da", label: "Dansk" },
  ];

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center h-6 w-6 rounded border transition-all ${
          open
            ? "border-stone-500 bg-stone-200 dark:bg-[#1C1C1D] text-stone-800 dark:text-stone-100"
            : "border-stone-200 dark:border-[#1C1C1D] bg-stone-100 dark:bg-[#111112] hover:bg-stone-200 dark:hover:bg-[#1C1C1D] text-stone-400 hover:text-stone-700 dark:hover:text-stone-200"
        }`}
        title="User menu"
      >
        <span className="text-[10px] font-bold">{initials}</span>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg shadow-xl z-50 overflow-hidden">
          {/* User info */}
          <div className="px-3 py-2.5 border-b border-stone-200 dark:border-stone-800">
            <p className="text-xs font-medium text-stone-900 dark:text-stone-100 truncate">
              {user?.email || "User"}
            </p>
          </div>

          {/* Theme */}
          <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5">{t.common.theme}</p>
            <div className="flex gap-1">
              {themeOptions.map((opt) => {
                const Icon = opt.icon;
                const isActive = theme === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setTheme(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      isActive
                        ? "bg-stone-900 dark:bg-white text-white dark:text-black"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                    }`}
                    title={opt.label}
                  >
                    <Icon className="size-3" />
                    <span className="hidden sm:inline">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Text Size */}
          <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 flex items-center gap-1">
              <Type className="size-3" /> {t.common.textSize}
            </p>
            <div className="flex gap-1">
              {(["sm", "md", "lg"] as const).map((size) => {
                const isActive = textSize === size;
                const label = size === "sm" ? "S" : size === "md" ? "M" : "L";
                return (
                  <button
                    key={size}
                    onClick={() => setTextSize(size)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      isActive
                        ? "bg-stone-900 dark:bg-white text-white dark:text-black"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Language */}
          <div className="px-3 py-2 border-b border-stone-200 dark:border-stone-800">
            <p className="text-[10px] font-bold uppercase tracking-widest text-stone-500 mb-1.5 flex items-center gap-1">
              <Globe className="size-3" /> {t.common.language}
            </p>
            <div className="flex gap-1">
              {languages.map((lang) => {
                const isActive = locale === lang.value;
                return (
                  <button
                    key={lang.value}
                    onClick={() => setLocale(lang.value)}
                    className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded text-[10px] font-medium transition-colors ${
                      isActive
                        ? "bg-stone-900 dark:bg-white text-white dark:text-black"
                        : "bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700"
                    }`}
                  >
                    {isActive && <Check className="size-2.5" />}
                    {lang.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              to="/settings/profile"
              onClick={() => setOpen(false)}
              className="w-full text-left px-3 py-2 text-xs text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors flex items-center gap-2"
            >
              <Settings className="size-3.5" />
              {t.common.settings}
            </Link>
            <button
              onClick={() => {
                setOpen(false);
                signOut();
              }}
              className="w-full text-left px-3 py-2 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors flex items-center gap-2"
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
