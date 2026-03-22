import { ThumbsUp, ThumbsDown, Bookmark } from "lucide-react";
import { useInteractionsStore } from "@/stores/interactions";
import { cn } from "@/lib/utils";

interface InteractionButtonsProps {
  storyId: string;
  size?: "sm" | "md";
  showBookmark?: boolean;
}

export function InteractionButtons({ storyId, size = "sm", showBookmark = true }: InteractionButtonsProps) {
  const interaction = useInteractionsStore((s) => s.getInteraction(storyId));
  const isBookmarked = useInteractionsStore((s) => s.isBookmarked(storyId));
  const toggleLike = useInteractionsStore((s) => s.toggleLike);
  const toggleDislike = useInteractionsStore((s) => s.toggleDislike);
  const toggleBookmark = useInteractionsStore((s) => s.toggleBookmark);

  const iconSize = size === "sm" ? "size-3.5" : "size-4";
  const btnBase = size === "sm"
    ? "p-1 rounded transition-colors"
    : "p-1.5 rounded-md transition-colors";

  return (
    <div className="flex items-center gap-0.5" onClick={(e) => e.preventDefault()}>
      <button
        onClick={() => toggleLike(storyId)}
        className={cn(
          btnBase,
          interaction === "like"
            ? "text-green-500 bg-green-500/10"
            : "text-stone-400 hover:text-green-500 hover:bg-green-500/10",
        )}
        title="Like"
      >
        <ThumbsUp className={cn(iconSize, interaction === "like" && "fill-current")} />
      </button>
      <button
        onClick={() => toggleDislike(storyId)}
        className={cn(
          btnBase,
          interaction === "dislike"
            ? "text-red-500 bg-red-500/10"
            : "text-stone-400 hover:text-red-500 hover:bg-red-500/10",
        )}
        title="Dislike"
      >
        <ThumbsDown className={cn(iconSize, interaction === "dislike" && "fill-current")} />
      </button>
      {showBookmark && (
        <button
          onClick={() => toggleBookmark(storyId)}
          className={cn(
            btnBase,
            isBookmarked
              ? "text-amber-500 bg-amber-500/10"
              : "text-stone-400 hover:text-amber-500 hover:bg-amber-500/10",
          )}
          title="Bookmark"
        >
          <Bookmark className={cn(iconSize, isBookmarked && "fill-current")} />
        </button>
      )}
    </div>
  );
}
