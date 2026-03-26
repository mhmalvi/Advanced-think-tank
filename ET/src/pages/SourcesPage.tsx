import { useEffect, useState, useRef, useCallback } from "react";
import { ExternalLink, ChevronUp, ChevronDown, Search, Database, ToggleLeft, ToggleRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { formatPublicationDate } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale";
import { useSettingsStore } from "@/stores/settings";

type ArticleRow = {
  id: string;
  title: string;
  url: string;
  author: string | null;
  published_at: string;
  region: string | null;
  topic_tags: string[];
  is_processed: boolean;
  embedding_id: string | null;
  source_name: string | null;
};

type SortColumn = "source_name" | "title" | "published_at" | "region";
type SortDir = "asc" | "desc";

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200] as const;

export function SourcesPage() {
  const [articles, setArticles] = useState<ArticleRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState<number>(50);
  const [sortCol, setSortCol] = useState<SortColumn>("published_at");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [regionFilter, setRegionFilter] = useState("");
  const locale = useLocaleStore((s) => s.locale);
  const t = useLocaleStore((s) => s.t);
  const disabledSources = useSettingsStore((s) => s.disabledSources);
  const toggleSource = useSettingsStore((s) => s.toggleSource);
  const [showSourceToggles, setShowSourceToggles] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Debounce search input by 400ms
  const handleSearchChange = useCallback((value: string) => {
    setSearchQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(0);
    }, 400);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  async function loadArticles() {
    setLoading(true);

    let query = supabase
      .from("articles")
      .select("id, title, url, author, published_at, region, topic_tags, is_processed, embedding_id, source_name", {
        count: "exact",
      });

    if (debouncedSearch.trim()) {
      const pattern = `%${debouncedSearch.trim()}%`;
      query = query.or(`title.ilike.${pattern},source_name.ilike.${pattern}`);
    }
    if (sourceFilter) {
      query = query.eq("source_name", sourceFilter);
    }
    if (regionFilter) {
      query = query.eq("region", regionFilter);
    }

    query = query.order(sortCol, { ascending: sortDir === "asc" }).range(page * pageSize, (page + 1) * pageSize - 1);

    const { data, count } = await query;
    setArticles((data ?? []) as ArticleRow[]);
    setTotalCount(count ?? 0);
    setLoading(false);
  }

  useEffect(() => {
    loadArticles();
  }, [page, pageSize, sortCol, sortDir, sourceFilter, regionFilter, debouncedSearch]);

  // Collect distinct sources and regions for filter dropdowns
  const [distinctSources, setDistinctSources] = useState<string[]>([]);
  const [distinctRegions, setDistinctRegions] = useState<string[]>([]);

  useEffect(() => {
    supabase
      .from("articles")
      .select("source_name")
      .not("source_name", "is", null)
      .then(({ data }) => {
        const names = [...new Set((data ?? []).map((r) => r.source_name as string))].sort();
        setDistinctSources(names);
      });
    supabase
      .from("articles")
      .select("region")
      .not("region", "is", null)
      .then(({ data }) => {
        const regions = [...new Set((data ?? []).map((r) => r.region as string))].sort();
        setDistinctRegions(regions);
      });
  }, []);

  function handleSort(col: SortColumn) {
    if (sortCol === col) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("desc");
    }
    setPage(0);
  }

  function sortIcon(col: SortColumn) {
    if (sortCol !== col) return null;
    return sortDir === "asc" ? <ChevronUp className="size-3 inline" /> : <ChevronDown className="size-3 inline" />;
  }

  function statusDot(article: ArticleRow) {
    if (article.is_processed && article.embedding_id) return "bg-green-500";
    if (!article.is_processed) return "bg-yellow-500";
    return "bg-red-500";
  }

  const startIdx = page * pageSize + 1;
  const endIdx = Math.min((page + 1) * pageSize, totalCount);

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 dark:bg-black">
      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1600px] mx-auto">
          <div className="flex items-center gap-3 mb-6">
            <Database className="size-5 text-stone-400" />
            <h1 className="text-lg font-bold text-stone-900 dark:text-white">Sources</h1>
            <span className="text-xs text-stone-400">{totalCount.toLocaleString()} articles</span>
            <button
              onClick={() => setShowSourceToggles(!showSourceToggles)}
              className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-stone-200 dark:border-stone-700 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              {showSourceToggles ? <ToggleRight className="size-3.5" /> : <ToggleLeft className="size-3.5" />}
              {t.profile.sourceToggles}
            </button>
          </div>

          {/* Source Toggle Panel */}
          {showSourceToggles && distinctSources.length > 0 && (
            <div className="mb-6 p-4 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-medium text-stone-900 dark:text-white">{t.profile.sourceToggles}</h3>
                  <p className="text-xs text-stone-500 mt-0.5">{t.profile.sourceTogglesDesc}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Enable all: remove all from disabledSources
                      disabledSources.forEach((s) => toggleSource(s));
                    }}
                    className="px-2 py-1 text-[10px] font-medium border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                  >
                    {t.profile.enableAll}
                  </button>
                  <button
                    onClick={() => {
                      // Disable all: add all not already disabled
                      distinctSources.forEach((s) => {
                        if (!disabledSources.includes(s)) toggleSource(s);
                      });
                    }}
                    className="px-2 py-1 text-[10px] font-medium border border-stone-200 dark:border-stone-700 rounded hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                  >
                    {t.profile.disableAll}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                {distinctSources.map((sourceName) => {
                  const isEnabled = !disabledSources.includes(sourceName);
                  return (
                    <button
                      key={sourceName}
                      onClick={() => toggleSource(sourceName)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium border transition-colors ${
                        isEnabled
                          ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300"
                          : "bg-stone-50 dark:bg-stone-900 border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 line-through"
                      }`}
                    >
                      <span
                        className={`size-2 rounded-full shrink-0 ${isEnabled ? "bg-green-500" : "bg-stone-300 dark:bg-stone-600"}`}
                      />
                      <span className="truncate">{sourceName}</span>
                    </button>
                  );
                })}
              </div>
              {disabledSources.length > 0 && (
                <p className="mt-3 text-[10px] text-stone-400">
                  {disabledSources.length} source{disabledSources.length !== 1 ? "s" : ""} disabled
                </p>
              )}
            </div>
          )}

          {/* Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search articles..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-stone-200 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-stone-900 dark:text-white placeholder:text-stone-400 outline-none focus:border-[#ef4444]"
              />
            </div>
            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-stone-900 dark:text-white"
            >
              <option value="">All sources</option>
              {distinctSources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select
              value={regionFilter}
              onChange={(e) => {
                setRegionFilter(e.target.value);
                setPage(0);
              }}
              className="px-3 py-2 text-sm border border-stone-200 dark:border-stone-700 rounded-md bg-white dark:bg-stone-900 text-stone-900 dark:text-white"
            >
              <option value="">All regions</option>
              {distinctRegions.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-stone-200 dark:border-stone-800 overflow-hidden bg-white dark:bg-stone-900/50">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900">
                    <th
                      className="px-4 py-3 text-left font-medium text-stone-500 cursor-pointer select-none"
                      onClick={() => handleSort("source_name")}
                    >
                      Source {sortIcon("source_name")}
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium text-stone-500 cursor-pointer select-none"
                      onClick={() => handleSort("title")}
                    >
                      Title {sortIcon("title")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-stone-500">Author</th>
                    <th
                      className="px-4 py-3 text-left font-medium text-stone-500 cursor-pointer select-none"
                      onClick={() => handleSort("published_at")}
                    >
                      Published {sortIcon("published_at")}
                    </th>
                    <th
                      className="px-4 py-3 text-left font-medium text-stone-500 cursor-pointer select-none"
                      onClick={() => handleSort("region")}
                    >
                      Region {sortIcon("region")}
                    </th>
                    <th className="px-4 py-3 text-left font-medium text-stone-500">Topics</th>
                    <th className="px-4 py-3 text-center font-medium text-stone-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                        Loading...
                      </td>
                    </tr>
                  ) : articles.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-stone-400">
                        No articles found
                      </td>
                    </tr>
                  ) : (
                    articles.map((article) => (
                      <tr
                        key={article.id}
                        className="border-b border-stone-100 dark:border-stone-800/50 hover:bg-stone-50 dark:hover:bg-stone-800/30"
                      >
                        <td className="px-4 py-2.5 text-stone-600 dark:text-stone-400 whitespace-nowrap">
                          {article.source_name ?? "—"}
                        </td>
                        <td className="px-4 py-2.5 max-w-xs">
                          <a
                            href={article.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-stone-900 dark:text-white hover:underline inline-flex items-center gap-1"
                          >
                            <span className="truncate">{article.title}</span>
                            <ExternalLink className="size-3 shrink-0 text-stone-400" />
                          </a>
                        </td>
                        <td className="px-4 py-2.5 text-stone-500 whitespace-nowrap">{article.author ?? "—"}</td>
                        <td className="px-4 py-2.5 text-stone-500 whitespace-nowrap">
                          {formatPublicationDate(article.published_at, locale)}
                        </td>
                        <td className="px-4 py-2.5">
                          {article.region && (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                              {article.region}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-wrap gap-1">
                            {(article.topic_tags ?? []).slice(0, 3).map((tag) => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400"
                              >
                                {tag}
                              </span>
                            ))}
                            {(article.topic_tags ?? []).length > 3 && (
                              <span className="text-[10px] text-stone-400">+{article.topic_tags.length - 3}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <span className={`inline-block size-2 rounded-full ${statusDot(article)}`} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-800">
              <div className="flex items-center gap-3">
                <span className="text-xs text-stone-500">
                  Showing {startIdx}–{endIdx} of {totalCount.toLocaleString()} articles
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(0);
                  }}
                  className="px-2 py-1 text-xs border border-stone-200 dark:border-stone-700 rounded bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} per page
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                  className="px-3 py-1 text-xs font-medium border border-stone-200 dark:border-stone-700 rounded disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  Previous
                </button>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={endIdx >= totalCount}
                  className="px-3 py-1 text-xs font-medium border border-stone-200 dark:border-stone-700 rounded disabled:opacity-40 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
