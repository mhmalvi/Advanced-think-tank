import { useState } from "react";
import { ChevronDown, ChevronRight, Clock } from "lucide-react";
import { formatPublicationDate } from "@/lib/utils";
import type { TimelineEntry } from "@/types/database";

interface StoryTimelineProps {
  entries: TimelineEntry[];
  locale?: string;
}

export function StoryTimeline({ entries, locale = "en" }: StoryTimelineProps) {
  const [expanded, setExpanded] = useState(true);

  if (entries.length === 0) return null;

  const handleEntryClick = (anchorId: string) => {
    // Try to find a heading that matches the anchor_id
    const slug = anchorId.toLowerCase().replace(/[^a-z0-9]+/g, "-");

    // Search for headings in the story content area
    const storyArea = document.querySelector("article");
    if (!storyArea) return;

    const headings = storyArea.querySelectorAll("h2, h3");
    for (const heading of headings) {
      const headingSlug = (heading.textContent ?? "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

      if (headingSlug.includes(slug) || slug.includes(headingSlug)) {
        heading.scrollIntoView({ behavior: "smooth", block: "start" });
        // Brief highlight
        heading.classList.add("bg-amber-100", "dark:bg-amber-900/30");
        setTimeout(() => {
          heading.classList.remove("bg-amber-100", "dark:bg-amber-900/30");
        }, 2000);
        return;
      }
    }
  };

  return (
    <div className="mb-6 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider hover:bg-stone-100 dark:hover:bg-stone-800/50 transition-colors"
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        <Clock className="size-3.5" />
        Timeline
        <span className="text-[10px] font-normal normal-case ml-1">({entries.length} events)</span>
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2">
          {entries.map((entry, i) => (
            <button
              key={i}
              onClick={() => handleEntryClick(entry.anchor_id)}
              className="w-full flex gap-3 items-start text-left group hover:bg-stone-100 dark:hover:bg-stone-800/40 rounded px-2 py-1.5 -mx-2 transition-colors"
            >
              <div className="flex flex-col items-center mt-1">
                <div
                  className={`size-2.5 rounded-full shrink-0 ${
                    i === 0
                      ? "bg-red-500 ring-2 ring-red-500/20"
                      : i === 1
                        ? "bg-amber-500 ring-2 ring-amber-500/20"
                        : "bg-stone-300 dark:bg-stone-600"
                  }`}
                />
                {i < entries.length - 1 && (
                  <div className="w-px h-full min-h-[12px] bg-stone-200 dark:bg-stone-700 mt-1" />
                )}
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-stone-400 dark:text-stone-500 block">
                  {formatPublicationDate(entry.timestamp, locale)}
                </span>
                <span
                  className={`text-xs leading-snug ${
                    i < 2
                      ? "text-stone-800 dark:text-stone-200 font-medium"
                      : "text-stone-500 dark:text-stone-400"
                  } group-hover:text-stone-900 dark:group-hover:text-white transition-colors`}
                >
                  {entry.summary}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
