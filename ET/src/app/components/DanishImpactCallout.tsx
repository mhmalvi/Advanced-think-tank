import type { Story } from "@/types/database";

const DANISH_KEYWORDS = [
  "denmark",
  "danish",
  "danmark",
  "dansk",
  "copenhagen",
  "københavn",
  "maersk",
  "mærsk",
  "novo nordisk",
  "vestas",
  "ørsted",
  "carlsberg",
  "danske bank",
  "nordic",
  "nordics",
  "scandinavia",
  "eu ",
  "european union",
  "ecb",
  "nato",
  "baltic",
  "arctic",
  "green transition",
  "wind energy",
  "offshore wind",
];

function detectDanishRelevance(story: Story): string | null {
  const text = `${story.title} ${story.synopsis || ""} ${story.cluster_topic || ""}`.toLowerCase();
  const labels = (story.labels || []).map((l) => l.text.toLowerCase());

  // Check region
  if (story.region === "Nordics" || story.region === "EU") {
    return story.region === "Nordics"
      ? "This story directly involves the Nordic region."
      : "EU policy developments with implications for Denmark.";
  }

  // Check labels for Danish relevance
  if (labels.some((l) => l.includes("danish") || l.includes("nordic") || l.includes("denmark"))) {
    return "Analysts flagged direct Danish business relevance.";
  }

  // Check content keywords
  for (const kw of DANISH_KEYWORDS) {
    if (text.includes(kw)) {
      return `Relevant to Danish interests — mentions ${kw.trim()}.`;
    }
  }

  return null;
}

export function DanishImpactCallout({ story }: { story: Story }) {
  const relevance = detectDanishRelevance(story);
  if (!relevance) return null;

  return (
    <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 mb-4">
      <span className="text-lg mt-0.5" role="img" aria-label="Denmark">
        🇩🇰
      </span>
      <div>
        <p className="text-sm font-medium text-red-900 dark:text-red-200">Danish Relevance</p>
        <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{relevance}</p>
      </div>
    </div>
  );
}
