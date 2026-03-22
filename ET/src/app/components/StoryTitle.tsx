import { Link } from "react-router-dom";
import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface StoryTitleProps {
  title: string;
  storyId: string;
  sourceUrl?: string;
  className?: string;
}

export function StoryTitle({ title, storyId, sourceUrl, className }: StoryTitleProps) {
  return (
    <span className="inline-flex items-start gap-1.5">
      <Link
        to={`/canvas/${storyId}`}
        className={cn(
          "hover:underline decoration-1 underline-offset-2 transition-colors",
          className,
        )}
      >
        {title}
      </Link>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 mt-1 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          title="Open source article"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="size-3" />
        </a>
      )}
    </span>
  );
}
