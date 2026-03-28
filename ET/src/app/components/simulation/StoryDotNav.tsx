/**
 * StoryDotNav — row of story cluster dots at the bottom of the simulation canvas.
 * Hover shows tooltip preview, click re-centers graph on that story's entities.
 */

import { useState } from "react";
import type { StoryMetric } from "@/types/simulation";

interface Story {
  id: string;
  title: string;
}

interface StoryDotNavProps {
  stories: Story[];
  metricsByStory: Record<string, StoryMetric>;
  activeStoryId: string | null;
  onSelect: (storyId: string) => void;
}

export function StoryDotNav({
  stories,
  metricsByStory,
  activeStoryId,
  onSelect,
}: StoryDotNavProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (stories.length === 0) return null;

  return (
    <div className="flex items-center justify-center gap-2 py-2 px-4 border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
      {stories.map((story) => {
        const metric = metricsByStory[story.id];
        const virality = metric?.predicted_virality ?? 0;
        const isActive = activeStoryId === story.id;
        const isHovered = hoveredId === story.id;

        // Color based on virality
        const dotColor =
          virality >= 0.6
            ? "bg-green-500"
            : virality >= 0.35
              ? "bg-amber-500"
              : virality > 0
                ? "bg-red-500"
                : "bg-stone-300 dark:bg-stone-600";

        return (
          <div key={story.id} className="relative">
            <button
              onClick={() => onSelect(story.id)}
              onMouseEnter={() => setHoveredId(story.id)}
              onMouseLeave={() => setHoveredId(null)}
              className={`size-3 rounded-full transition-all duration-200 ${dotColor} ${
                isActive
                  ? "ring-2 ring-[#E30613] ring-offset-1 ring-offset-stone-50 dark:ring-offset-stone-900 scale-125"
                  : "hover:scale-125"
              }`}
              title={story.title}
            />

            {/* Hover tooltip */}
            {isHovered && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2 bg-stone-900 dark:bg-stone-800 text-white rounded shadow-lg z-50 pointer-events-none">
                <p className="text-[10px] font-medium line-clamp-2 leading-tight">
                  {story.title}
                </p>
                {metric && (
                  <div className="flex items-center gap-3 mt-1 text-[9px] text-stone-400">
                    <span>{Math.round(virality * 100)}% virality</span>
                    <span>{metric.share_count} shares</span>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
