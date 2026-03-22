import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Newspaper, TrendingUp } from "lucide-react";
import { useStoriesStore } from "@/stores/stories";
import { useLocaleStore } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { formatPublicationDate } from "@/lib/utils";
import { Skeleton } from "@/app/components/ui/skeleton";
import { StoryLabels } from "@/app/components/StoryLabel";
import type { Story } from "@/types/database";
import { SearchBar } from "@/app/components/SearchBar";
import { InteractionButtons } from "@/app/components/InteractionButtons";
import { useInteractionsStore } from "@/stores/interactions";

function SourceCountBadge({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-stone-500 dark:text-stone-400">
      <Newspaper className="size-3" />
      {count} {count === 1 ? "source" : "sources"}
    </span>
  );
}

// ─── Hero Story ───
function HeroStory({ story }: { story: Story }) {
  const locale = useLocaleStore((s) => s.locale);

  return (
    <Link
      to={`/canvas/${story.id}`}
      className="block group rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 p-6 md:p-8 hover:border-stone-400 dark:hover:border-stone-600 transition-colors"
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="px-2 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold uppercase tracking-wider">
          Featured
        </span>
        <SourceCountBadge count={story.source_count} />
        <span className="text-[11px] text-stone-400 dark:text-stone-500">
          {formatPublicationDate(story.created_at, locale)}
        </span>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-stone-900 dark:text-white mb-3 group-hover:underline decoration-2 underline-offset-4">
        {story.title}
      </h2>

      {story.synopsis && (
        <p className="text-base text-stone-600 dark:text-stone-400 leading-relaxed mb-4 max-w-3xl line-clamp-3">
          {story.synopsis}
        </p>
      )}

      <div className="flex items-center justify-between">
        <StoryLabels labels={story.labels} max={6} />
        <InteractionButtons storyId={story.id} />
      </div>
    </Link>
  );
}

// ─── Story Card ───
function StoryCard({ story }: { story: Story }) {
  const locale = useLocaleStore((s) => s.locale);

  return (
    <Link
      to={`/canvas/${story.id}`}
      className="group flex flex-col rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 p-4 hover:border-stone-400 dark:hover:border-stone-600 transition-colors h-full"
    >
      <div className="flex items-center gap-2 mb-2">
        <SourceCountBadge count={story.source_count} />
        <span className="text-[11px] text-stone-400 dark:text-stone-500">
          {formatPublicationDate(story.created_at, locale)}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-stone-900 dark:text-white mb-2 group-hover:underline decoration-1 underline-offset-2 line-clamp-2">
        {story.title}
      </h3>

      {story.synopsis && (
        <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-3 line-clamp-2 flex-1">
          {story.synopsis}
        </p>
      )}

      <div className="flex items-center justify-between mt-auto">
        <StoryLabels labels={story.labels} max={4} />
        <InteractionButtons storyId={story.id} />
      </div>
    </Link>
  );
}

// ─── Region Section ───
function RegionSection({ region, stories }: { region: string; stories: Story[] }) {
  return (
    <section className="mb-8">
      <div className="flex items-center gap-2 mb-4 border-b border-stone-200 dark:border-stone-800 pb-2">
        <TrendingUp className="size-4 text-stone-400" />
        <h2 className="text-sm font-bold text-stone-900 dark:text-stone-100 uppercase tracking-wider">
          {region}
        </h2>
        <span className="text-xs text-stone-400">{stories.length}</span>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.map((story) => (
          <StoryCard key={story.id} story={story} />
        ))}
      </div>
    </section>
  );
}

// ─── Loading Skeletons ───
function HeroSkeleton() {
  return (
    <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 p-6 md:p-8">
      <div className="flex gap-2 mb-3">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-9 w-3/4 mb-3" />
      <Skeleton className="h-5 w-full mb-2" />
      <Skeleton className="h-5 w-2/3 mb-4" />
      <div className="flex gap-1">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}

function CardSkeleton() {
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50 p-4">
      <div className="flex gap-2 mb-2">
        <Skeleton className="h-4 w-16" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="h-5 w-full mb-1" />
      <Skeleton className="h-5 w-3/4 mb-2" />
      <Skeleton className="h-4 w-full mb-1" />
      <Skeleton className="h-4 w-2/3 mb-3" />
      <div className="flex gap-1">
        <Skeleton className="h-4 w-14" />
        <Skeleton className="h-4 w-16" />
      </div>
    </div>
  );
}

// ─── Onboarding Banner ───
function OnboardingBanner() {
  const t = useLocaleStore((s) => s.t);
  return (
    <Link
      to="/settings/profile"
      className="block rounded-lg border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/30 p-4 mb-6 hover:border-amber-300 dark:hover:border-amber-800 transition-colors"
    >
      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
        Complete your setup for personalized news
      </p>
      <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">
        Set your industry interests, geographic focus, and analysis lenses.
      </p>
    </Link>
  );
}

// ─── Main Dashboard ───
export function CommandCenter() {
  const { stories, featuredStory, storiesLoading, storiesError, fetchStories, storiesByRegion } = useStoriesStore();
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const fetchInteractions = useInteractionsStore((s) => s.fetchInteractions);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    if (stories.length > 0) {
      fetchInteractions(stories.map((s) => s.id));
    }
  }, [stories, fetchInteractions]);

  const regionGroups = storiesByRegion();
  const regionOrder = ["Nordics", "EU", "Global", "Asia", "Middle East", "USA"];
  const sortedRegions = [
    ...regionOrder.filter((r) => regionGroups[r]),
    ...Object.keys(regionGroups).filter((r) => !regionOrder.includes(r)),
  ];

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 dark:bg-black">
      <SearchBar />

      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1400px] mx-auto">
          {needsOnboarding && <OnboardingBanner />}

          {/* Loading state */}
          {storiesLoading && stories.length === 0 && (
            <>
              <HeroSkeleton />
              <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </>
          )}

          {/* Error state */}
          {storiesError && stories.length === 0 && (
            <div className="text-center py-16">
              <p className="text-sm text-stone-500 mb-3">{storiesError}</p>
              <button
                onClick={fetchStories}
                className="px-4 py-2 text-sm font-medium bg-stone-900 dark:bg-white text-white dark:text-black rounded hover:opacity-90 transition-opacity"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty state */}
          {!storiesLoading && !storiesError && stories.length === 0 && (
            <div className="text-center py-16">
              <Newspaper className="size-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
              <p className="text-sm text-stone-500">No stories yet. Check back soon.</p>
            </div>
          )}

          {/* Hero story */}
          {featuredStory && <HeroStory story={featuredStory} />}

          {/* Regional sections */}
          {sortedRegions.length > 0 && (
            <div className="mt-8">
              {sortedRegions.map((region) => (
                <RegionSection key={region} region={region} stories={regionGroups[region]} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
