import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Bookmark, Newspaper } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useInteractionsStore } from "@/stores/interactions";
import { formatPublicationDate } from "@/lib/utils";
import { useLocaleStore } from "@/stores/locale";
import type { Story } from "@/types/database";

type BookmarkedStory = Story & { bookmarked_at: string };

export function BookmarksSettings() {
  const [stories, setStories] = useState<BookmarkedStory[]>([]);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);
  const locale = useLocaleStore((s) => s.locale);
  const toggleBookmark = useInteractionsStore((s) => s.toggleBookmark);

  async function loadBookmarks() {
    setLoading(true);
    const { data } = await supabase
      .from("user_interactions")
      .select("story_id, created_at, stories(*)")
      .eq("user_id", user!.id)
      .eq("interaction_type", "bookmark")
      .order("created_at", { ascending: false });

    const results: BookmarkedStory[] = (data ?? [])
      .filter((row) => row.stories)
      .map((row) => ({
        ...(row.stories as unknown as Story),
        bookmarked_at: row.created_at,
      }));

    setStories(results);
    setLoading(false);
  }

  useEffect(() => {
    if (!user?.id) return;
    loadBookmarks();
  }, [user?.id]);

  async function handleUnbookmark(storyId: string) {
    await toggleBookmark(storyId);
    setStories((prev) => prev.filter((s) => s.id !== storyId));
  }

  if (loading) {
    return <div className="p-6 text-sm text-stone-500">Loading bookmarks...</div>;
  }

  if (stories.length === 0) {
    return (
      <div className="p-6 text-center">
        <Bookmark className="size-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
        <p className="text-sm text-stone-500">
          No bookmarks yet. Bookmark stories from the dashboard or canvas to find them here.
        </p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-3">
      {stories.map((story) => (
        <div
          key={story.id}
          className="flex items-start justify-between gap-4 p-4 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50"
        >
          <Link to={`/canvas/${story.id}`} className="flex-1 min-w-0 group">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-white group-hover:underline truncate">
              {story.title}
            </h3>
            {story.synopsis && (
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-1 line-clamp-2">{story.synopsis}</p>
            )}
            <div className="flex items-center gap-2 mt-2 text-[11px] text-stone-400">
              <Newspaper className="size-3" />
              <span>{story.source_count} sources</span>
              <span>Bookmarked {formatPublicationDate(story.bookmarked_at, locale)}</span>
            </div>
          </Link>
          <button
            onClick={() => handleUnbookmark(story.id)}
            className="shrink-0 p-1.5 text-amber-500 hover:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 rounded transition-colors"
            title="Remove bookmark"
          >
            <Bookmark className="size-4 fill-current" />
          </button>
        </div>
      ))}
    </div>
  );
}
