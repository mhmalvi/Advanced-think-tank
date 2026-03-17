import { Search, Sparkles, Loader2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useLocaleStore } from "@/stores/locale";
import { useAppStore } from "@/stores/app";

export function OmniPromptBar() {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const location = useLocation();
  const { t } = useLocaleStore();
  const submitQuery = useAppStore((s) => s.submitQuery);
  const queryLoading = useAppStore((s) => s.queryLoading);
  const loadingPhase = useAppStore((s) => s.loadingPhase);
  const queryError = useAppStore((s) => s.queryError);

  const isFrontPage = location.pathname === "/";

  const placeholderText = isFrontPage
    ? t.prompt.searchMacro
    : t.prompt.searchMicro;

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim() || queryLoading) return;

    await submitQuery(query.trim());
    setQuery("");
  };

  const phaseLabel = loadingPhase === "searching" ? "Searching sources..."
    : loadingPhase === "analyzing" ? "Analyzing with AI..."
    : loadingPhase === "generating" ? "Generating synthesis..."
    : null;

  return (
    <div className="bg-stone-50 dark:bg-[#0f1011] p-4 md:p-6 lg:p-8">
      <div className="max-w-[1800px] mx-auto">
        <form onSubmit={handleSubmit} className="relative group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 size-5 text-stone-500 dark:text-[#5F5F5F] group-focus-within:text-[#ef4444] transition-colors" />

          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={placeholderText}
            disabled={queryLoading}
            className="w-full pl-14 pr-24 py-5 text-[15px] outline-none bg-white dark:bg-[#0a0a0b] text-stone-900 dark:text-white placeholder:text-stone-400 dark:placeholder:text-[#5F5F5F] border-2 border-stone-300 dark:border-stone-700 shadow-md dark:shadow-[0_2px_12px_rgba(0,0,0,0.3)] rounded-lg focus:border-[#ef4444] dark:focus:border-[#ef4444] transition-all focus:shadow-[0_0_20px_rgba(239,68,68,0.15)] disabled:opacity-60"
          />

          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <kbd className="hidden sm:flex items-center justify-center h-7 px-2 text-[10px] text-stone-500 dark:text-[#5F5F5F] font-bold bg-stone-100 dark:bg-[#111112] rounded border border-stone-200 dark:border-[#1C1C1D] font-mono">
              CMD + K
            </kbd>
            <button
              type="submit"
              disabled={!query.trim() || queryLoading}
              className="w-8 h-8 flex items-center justify-center bg-[#ef4444] hover:bg-[#dc2626] disabled:opacity-50 disabled:bg-stone-200 dark:disabled:bg-[#1C1C1D] text-white rounded transition-all"
            >
              {queryLoading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            </button>
          </div>
        </form>

        {phaseLabel && (
          <div className="mt-2 flex items-center gap-2 text-xs text-[#ef4444] font-medium">
            <Loader2 className="size-3 animate-spin" />
            {phaseLabel}
          </div>
        )}

        {queryError && (
          <div className="mt-2 text-xs text-red-500 font-medium">
            {queryError}
          </div>
        )}

        {!isFrontPage && !queryLoading && (
          <div className="flex items-center gap-3 mt-3">
            <span className="text-xs text-stone-500 dark:text-stone-500 uppercase tracking-wider font-bold">{t.prompt.quickActions}:</span>
            <div className="flex gap-2">
              {[t.prompt.expandTimeline, t.prompt.findContradictions, t.prompt.summarizeSentiment].map((q) => (
                <button
                  key={q}
                  onClick={() => setQuery(q)}
                  className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider border border-stone-200 dark:border-stone-800 text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:border-stone-400 dark:hover:border-stone-600 rounded transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
