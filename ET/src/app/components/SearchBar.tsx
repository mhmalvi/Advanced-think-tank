import { Search, X, Loader2, Clock } from "lucide-react";
import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useLocaleStore } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { searchStories, saveSearchHistory, fetchRecentSearches } from "@/lib/api";

export function SearchBar() {
  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [searching, setSearching] = useState(false);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [noResults, setNoResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const navigate = useNavigate();
  const { t } = useLocaleStore();
  const user = useAuthStore((s) => s.user);

  // Load recent searches when focused
  useEffect(() => {
    if (focused && user?.id) {
      fetchRecentSearches(user.id, 5).then(setRecentSearches);
    }
  }, [focused, user?.id]);

  // Cmd+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const trimmed = query.trim();
      if (!trimmed || searching) return;

      setSearching(true);
      setNoResults(false);

      try {
        // Save to history
        if (user?.id) {
          saveSearchHistory(user.id, trimmed);
        }

        // Search existing stories
        const story = await searchStories(trimmed);

        if (story) {
          setQuery("");
          setFocused(false);
          navigate(`/canvas/${story.id}`);
        } else {
          setNoResults(true);
        }
      } finally {
        setSearching(false);
      }
    },
    [query, searching, user?.id, navigate],
  );

  const handleRecentClick = (text: string) => {
    setQuery(text);
    setFocused(false);
    inputRef.current?.focus();
  };

  const showDropdown = focused && recentSearches.length > 0 && !query.trim();

  return (
    <div className="bg-stone-50 dark:bg-[#0f1011] p-4 md:p-6 lg:p-8" ref={wrapperRef}>
      <div className="max-w-[1800px] mx-auto relative">
        <form onSubmit={handleSubmit} className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-stone-500 dark:text-[#5F5F5F] group-focus-within:text-[#ef4444] transition-colors" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNoResults(false);
            }}
            onFocus={() => setFocused(true)}
            placeholder={t.search?.placeholder ?? "Ask anything — e.g., 'What happened with US tariffs today?'"}
            disabled={searching}
            className="w-full pl-14 pr-24 py-5 text-[15px] outline-none bg-white dark:bg-[#0a0a0b] text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-[#5F5F5F] border-2 border-stone-300 dark:border-stone-700 shadow-md dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] rounded-lg focus:border-[#ef4444] dark:focus:border-[#ef4444] transition-all focus:shadow-[0_0_20px_rgba(239,68,68,0.15)] disabled:opacity-60"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  setNoResults(false);
                }}
                className="p-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
              >
                <X className="size-4" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center justify-center h-7 px-2 text-[10px] text-stone-500 dark:text-[#5F5F5F] font-bold bg-stone-100 dark:bg-[#111112] rounded border border-stone-200 dark:border-[#1C1C1D] font-mono">
              {navigator.platform?.includes("Mac") ? "⌘K" : "Ctrl+K"}
            </kbd>
            <button
              type="submit"
              disabled={!query.trim() || searching}
              className="w-8 h-8 flex items-center justify-center bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:bg-stone-200 dark:disabled:bg-[#1C1C1D] text-white rounded transition-all"
            >
              {searching ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
            </button>
          </div>
        </form>

        {/* Recent searches dropdown */}
        {showDropdown && (
          <div className="absolute z-50 top-full mt-1 w-full bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-stone-700 rounded-lg shadow-lg overflow-hidden">
            <div className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              {t.search?.recentSearches ?? "Recent searches"}
            </div>
            {recentSearches.map((text, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(text)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left"
              >
                <Clock className="size-3.5 text-stone-400 shrink-0" />
                <span className="truncate">{text}</span>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {noResults && (
          <div className="mt-2 text-xs text-stone-500 font-medium">
            {t.search?.noResults ?? "No matching stories found. Try broadening your search."}
          </div>
        )}

        {/* Loading state */}
        {searching && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#ef4444] font-medium">
            <Loader2 className="size-3 animate-spin" />
            {t.search?.searching ?? "Scanning stories..."}
          </div>
        )}
      </div>
    </div>
  );
}
