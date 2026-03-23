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
    <div className="border-b border-stone-200 dark:border-stone-800 bg-white dark:bg-[#0a0a0b]" ref={wrapperRef}>
      <div className="max-w-[960px] mx-auto px-6 md:px-10 lg:px-16 py-4 relative">
        <form onSubmit={handleSubmit} className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-stone-400 dark:text-stone-500 group-focus-within:text-stone-700 dark:group-focus-within:text-stone-300 transition-colors" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setNoResults(false);
            }}
            onFocus={() => setFocused(true)}
            placeholder={t.search?.placeholder ?? "Search intelligence briefs..."}
            disabled={searching}
            className="w-full pl-11 pr-20 py-3 text-sm font-serif outline-none bg-stone-50 dark:bg-stone-900/50 text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-stone-500 border border-stone-200 dark:border-stone-700 rounded-md focus:border-[#E30613]/50 focus:ring-1 focus:ring-[#E30613]/20 dark:focus:border-[#E30613]/50 transition-all disabled:opacity-60"
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
                <X className="size-3.5" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center justify-center h-6 px-1.5 text-[10px] text-stone-400 dark:text-stone-500 font-mono bg-white dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
              {navigator.platform?.includes("Mac") ? "⌘K" : "Ctrl+K"}
            </kbd>
          </div>
        </form>

        {/* Recent searches dropdown */}
        {showDropdown && (
          <div className="absolute z-50 left-6 right-6 md:left-10 md:right-10 lg:left-16 lg:right-16 top-full mt-1 bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-stone-700 rounded-md shadow-lg overflow-hidden">
            <div className="px-4 py-2 text-[10px] font-medium uppercase tracking-wider text-stone-400">
              {t.search?.recentSearches ?? "Recent"}
            </div>
            {recentSearches.map((text, i) => (
              <button
                key={i}
                onClick={() => handleRecentClick(text)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left"
              >
                <Clock className="size-3 text-stone-400 shrink-0" />
                <span className="truncate">{text}</span>
              </button>
            ))}
          </div>
        )}

        {/* No results message */}
        {noResults && (
          <div className="mt-2 text-xs text-stone-500">
            {t.search?.noResults ?? "No matching briefs found. Try broadening your search."}
          </div>
        )}

        {/* Loading state */}
        {searching && (
          <div className="mt-2 flex items-center gap-2 text-xs text-stone-500">
            <Loader2 className="size-3 animate-spin" />
            {t.search?.searching ?? "Scanning briefs..."}
          </div>
        )}
      </div>
    </div>
  );
}
