import { useMemo } from "react";
import { useAppStore } from "@/stores/app";
import type { Story } from "@/types/database";

function getFaviconUrl(siteUrl: string): string {
  try {
    const domain = new URL(siteUrl).hostname;
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  } catch {
    return "";
  }
}

interface SourceCarouselProps {
  story: Story;
  max?: number;
}

export function SourceCarousel({ story, max = 6 }: SourceCarouselProps) {
  const allSources = useAppStore((s) => s.sources);

  const matchedSources = useMemo(() => {
    const sourceLabels = story.labels.filter((l) => l.type === "source").map((l) => l.text.toLowerCase());

    if (sourceLabels.length === 0) return [];

    return allSources.filter((s) => sourceLabels.includes(s.name.toLowerCase())).slice(0, max);
  }, [story.labels, allSources, max]);

  if (matchedSources.length === 0) return null;

  const overflow = story.labels.filter((l) => l.type === "source").length - matchedSources.length;

  return (
    <div className="flex items-center gap-1.5">
      {matchedSources.map((source) => {
        const favicon = getFaviconUrl(source.url);
        return (
          <a
            key={source.id}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={source.name}
            className="shrink-0 size-6 rounded-full bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center justify-center overflow-hidden hover:border-stone-400 dark:hover:border-stone-500 transition-colors"
          >
            {favicon ? (
              <img
                src={favicon}
                alt={source.name}
                className="size-4 object-contain"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                  (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                }}
              />
            ) : null}
            <span className="text-[8px] font-bold text-stone-500 dark:text-stone-400 hidden">
              {source.name.slice(0, 2).toUpperCase()}
            </span>
          </a>
        );
      })}
      {overflow > 0 && (
        <span className="text-[10px] text-stone-400 dark:text-stone-500 font-medium ml-0.5">+{overflow}</span>
      )}
    </div>
  );
}
