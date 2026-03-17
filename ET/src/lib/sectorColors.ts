// Map source names (lowercase) to sectors
const SOURCE_SECTOR_MAP: Record<string, string> = {
  "financial times": "Finance",
  "ft": "Finance",
  "wall street journal": "Finance",
  "wsj": "Finance",
  "bloomberg": "Finance",
  "reuters": "Geopolitics",
  "al jazeera": "Geopolitics",
  "associated press": "Geopolitics",
  "ap news": "Geopolitics",
  "bbc": "Geopolitics",
  "nikkei": "Macro",
  "nikkei asia": "Macro",
  "caixin": "Macro",
  "south china morning post": "Macro",
  "scmp": "Macro",
  "the economist": "Macro",
  "techcrunch": "Tech",
  "the verge": "Tech",
  "wired": "Tech",
  "ars technica": "Tech",
  "mit technology review": "AI",
  "the information": "AI",
  "semafor": "Geopolitics",
  "politico": "Geopolitics",
  "foreign affairs": "Geopolitics",
  "defense one": "Geopolitics",
  "energy voice": "Energy",
  "oilprice": "Energy",
  "freightwaves": "Logistics",
  "the loadstar": "Logistics",
  "semiconductor engineering": "Semiconductors",
  "tom's hardware": "Semiconductors",
};

/** Maps a source name to a sector. Returns "News" for unknown sources. */
export function getSourceSector(sourceName: string): string {
  const key = sourceName.toLowerCase().trim();
  if (SOURCE_SECTOR_MAP[key]) return SOURCE_SECTOR_MAP[key];
  // Partial match fallback
  for (const [pattern, sector] of Object.entries(SOURCE_SECTOR_MAP)) {
    if (key.includes(pattern) || pattern.includes(key)) return sector;
  }
  return "News";
}

/** Derives urgency from article age. */
export function getUrgencyFromAge(publishedAt: string): "low" | "medium" | "high" | "critical" {
  const ageMs = Date.now() - new Date(publishedAt).getTime();
  const ageHours = ageMs / (1000 * 60 * 60);
  if (ageHours < 1) return "critical";
  if (ageHours < 6) return "high";
  if (ageHours < 24) return "medium";
  return "low";
}

/** Formats a relative time string from a date. */
export function getRelativeTime(dateStr: string): string {
  const ageMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(ageMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const SECTOR_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  Logistics: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", dot: "bg-blue-500" },
  Finance: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
  AI: { bg: "bg-violet-100 dark:bg-violet-900/30", text: "text-violet-700 dark:text-violet-400", dot: "bg-violet-500" },
  Tech: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-400", dot: "bg-cyan-500" },
  Semiconductors: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", dot: "bg-orange-500" },
  Energy: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
  Geopolitics: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
  Macro: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", dot: "bg-indigo-500" },
  News: { bg: "bg-stone-100 dark:bg-stone-800", text: "text-stone-600 dark:text-stone-400", dot: "bg-stone-400" },
};

const DEFAULT = { bg: "bg-stone-100 dark:bg-stone-800", text: "text-stone-600 dark:text-stone-400", dot: "bg-stone-400" };

export function getSectorColor(sector: string) {
  return SECTOR_COLORS[sector] || DEFAULT;
}
