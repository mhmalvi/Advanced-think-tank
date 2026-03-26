import { useEffect, useMemo, useCallback, memo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronRight } from "lucide-react";
import { useStoriesStore } from "@/stores/stories";
import { useLocaleStore } from "@/stores/locale";
import { useAuthStore } from "@/stores/auth";
import { formatPublicationDate } from "@/lib/utils";
import { Skeleton } from "@/app/components/ui/skeleton";
import { StoryLabels } from "@/app/components/StoryLabel";
import type { Story } from "@/types/database";
import { SearchBar } from "@/app/components/SearchBar";
import { InteractionButtons } from "@/app/components/InteractionButtons";
import { SourceCarousel } from "@/app/components/SourceCarousel";
import { useInteractionsStore } from "@/stores/interactions";
import { useSettingsStore } from "@/stores/settings";

// ─── Dateline ───
function Dateline() {
  const t = useLocaleStore((s) => s.t);
  const now = new Date();
  const formatted = now.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="flex items-center justify-between border-b border-stone-300 dark:border-stone-700 pb-3 mb-6">
      <span className="text-xs tracking-widest uppercase text-stone-500 dark:text-stone-400 font-medium">
        {t.dashboard.intelligenceBriefing}
      </span>
      <span className="text-xs text-stone-400 dark:text-stone-500">{formatted}</span>
    </div>
  );
}

// ─── Hero Story (CNN-style attention grab + WSJ typography) ───
const HeroStory = memo(function HeroStory({ story }: { story: Story }) {
  const { locale, t } = useLocaleStore();

  return (
    <Link to={`/canvas/${story.id}`} className="block group mb-10">
      <div className="border-b-2 border-stone-900 dark:border-stone-100 pb-8">
        {/* Hero image — CNN-style visual pull */}
        {story.image_url && (
          <div className="relative w-full aspect-[16/9] mb-5 rounded overflow-hidden bg-stone-100 dark:bg-stone-800">
            <img
              src={story.image_url}
              alt=""
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-500"
              loading="eager"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
          </div>
        )}

        {/* Topic + source meta */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-[#E30613] dark:text-[#ff1a1a]">
            {story.cluster_topic || t.dashboard.analysis}
          </span>
          <span className="text-[11px] text-stone-400 dark:text-stone-500">
            {story.source_count} {t.dashboard.sources}
          </span>
          <span className="text-[11px] text-stone-400 dark:text-stone-500">
            {formatPublicationDate(story.created_at, locale)}
          </span>
        </div>

        {/* Headline — serif, large, confident */}
        <h1 className="font-serif text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-stone-900 dark:text-white leading-[1.15] mb-4 group-hover:text-[#E30613] dark:group-hover:text-[#ff1a1a] transition-colors">
          {story.title}
        </h1>

        {/* Synopsis — the "why it matters" line */}
        {story.synopsis && (
          <p className="font-serif text-lg md:text-xl text-stone-600 dark:text-stone-400 leading-relaxed max-w-3xl mb-5">
            {story.synopsis}
          </p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <StoryLabels labels={story.labels} max={5} />
            <SourceCarousel story={story} max={5} />
          </div>
          <div className="flex items-center gap-3">
            <InteractionButtons storyId={story.id} />
            <span className="text-xs text-stone-400 group-hover:text-[#E30613] dark:group-hover:text-[#ff1a1a] flex items-center gap-1 transition-colors">
              {t.dashboard.readFullAnalysis} <ArrowRight className="size-3" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
});

// ─── Lead Story Card (WSJ-style — prominent, text-first with optional thumbnail) ───
const LeadCard = memo(function LeadCard({ story }: { story: Story }) {
  const { locale, t } = useLocaleStore();

  return (
    <Link to={`/canvas/${story.id}`} className="group block">
      <div className="py-5 border-b border-stone-200 dark:border-stone-800">
        <div className="flex gap-4">
          {/* Text content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-stone-500 dark:text-stone-400">
                {story.cluster_topic || t.dashboard.analysis}
              </span>
              <span className="text-[10px] text-stone-400 dark:text-stone-500">
                {story.source_count} {t.dashboard.sources}
              </span>
            </div>

            <h3 className="font-serif text-lg md:text-xl font-semibold text-stone-900 dark:text-white leading-snug mb-2 group-hover:text-[#E30613] dark:group-hover:text-[#ff1a1a] transition-colors">
              {story.title}
            </h3>

            {story.synopsis && (
              <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed line-clamp-2 mb-3">
                {story.synopsis}
              </p>
            )}

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StoryLabels labels={story.labels} max={3} />
                <SourceCarousel story={story} max={4} />
              </div>
              <div className="flex items-center gap-2">
                <InteractionButtons storyId={story.id} />
                <span className="text-[11px] text-stone-400 dark:text-stone-500">
                  {formatPublicationDate(story.created_at, locale)}
                </span>
              </div>
            </div>
          </div>

          {/* Thumbnail — WSJ style: image supports the story, doesn't dominate */}
          {story.image_url && (
            <div className="hidden sm:block w-28 md:w-36 shrink-0">
              <div className="aspect-[4/3] rounded overflow-hidden bg-stone-100 dark:bg-stone-800">
                <img
                  src={story.image_url}
                  alt=""
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
});

// ─── Compact Story Row (for secondary stories — minimal, scannable) ───
const CompactRow = memo(function CompactRow({ story }: { story: Story }) {
  const locale = useLocaleStore((s) => s.locale);

  return (
    <Link
      to={`/canvas/${story.id}`}
      className="group flex items-start gap-3 py-3 border-b border-stone-100 dark:border-stone-800/50 last:border-0"
    >
      <ChevronRight className="size-3.5 text-stone-300 dark:text-stone-600 mt-1 shrink-0 group-hover:text-[#E30613] dark:group-hover:text-[#ff1a1a] transition-colors" />
      <div className="flex-1 min-w-0">
        <h4 className="font-serif text-[15px] font-semibold text-stone-800 dark:text-stone-200 leading-snug group-hover:text-[#E30613] dark:group-hover:text-[#ff1a1a] transition-colors line-clamp-2">
          {story.title}
        </h4>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-[10px] uppercase tracking-wider text-stone-400 dark:text-stone-500 font-medium">
            {story.cluster_topic || story.region}
          </span>
          <span className="text-[10px] text-stone-400 dark:text-stone-500">
            {formatPublicationDate(story.created_at, locale)}
          </span>
        </div>
      </div>
      <InteractionButtons storyId={story.id} />
    </Link>
  );
});

// ─── Section Header (WSJ-style — clean rule + label) ───
function SectionHeader({ title, count }: { title: string; count: number }) {
  const t = useLocaleStore((s) => s.t);
  return (
    <div className="flex items-baseline gap-3 border-b-2 border-stone-900 dark:border-stone-200 pb-1.5 mb-1">
      <h2 className="text-xs font-bold uppercase tracking-[0.15em] text-stone-900 dark:text-stone-100">{title}</h2>
      <span className="text-[10px] text-stone-400 dark:text-stone-500">
        {count} {t.dashboard.stories}
      </span>
    </div>
  );
}

// ─── Region Section ───
const RegionSection = memo(function RegionSection({ region, stories }: { region: string; stories: Story[] }) {
  if (stories.length === 0) return null;

  // First story gets lead treatment, rest are compact rows
  const [lead, ...rest] = stories;

  return (
    <section className="mb-10">
      <SectionHeader title={region} count={stories.length} />
      {lead && <LeadCard story={lead} />}
      {rest.length > 0 && (
        <div className="mt-1">
          {rest.map((story) => (
            <CompactRow key={story.id} story={story} />
          ))}
        </div>
      )}
    </section>
  );
});

// ─── Loading Skeletons ───
function HeroSkeleton() {
  return (
    <div className="border-b-2 border-stone-200 dark:border-stone-800 pb-8 mb-10">
      <Skeleton className="h-3 w-20 mb-4" />
      <Skeleton className="h-12 w-4/5 mb-3" />
      <Skeleton className="h-12 w-3/5 mb-4" />
      <Skeleton className="h-6 w-full mb-2" />
      <Skeleton className="h-6 w-3/4 mb-5" />
      <div className="flex gap-2">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-5 w-14" />
      </div>
    </div>
  );
}

function SectionSkeleton() {
  return (
    <div className="mb-10">
      <Skeleton className="h-4 w-24 mb-4" />
      <div className="border-b border-stone-200 dark:border-stone-800 pb-5 mb-3">
        <Skeleton className="h-3 w-16 mb-2" />
        <Skeleton className="h-7 w-4/5 mb-2" />
        <Skeleton className="h-5 w-full mb-1" />
        <Skeleton className="h-5 w-2/3" />
      </div>
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="flex gap-3 py-3 border-b border-stone-100 dark:border-stone-800/50">
          <Skeleton className="h-4 w-4 shrink-0" />
          <div className="flex-1">
            <Skeleton className="h-5 w-full mb-1" />
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Onboarding Banner ───
function OnboardingBanner() {
  const t = useLocaleStore((s) => s.t);
  return (
    <Link
      to="/settings/profile"
      className="block border-l-2 border-[#E30613] pl-4 py-3 mb-8 hover:bg-stone-50 dark:hover:bg-stone-900/30 transition-colors"
    >
      <p className="text-sm font-medium text-stone-800 dark:text-stone-200">{t.dashboard.setupProfile}</p>
      <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{t.dashboard.setupProfileDesc}</p>
    </Link>
  );
}

// ─── Main Dashboard ───
export function CommandCenter() {
  const { stories, featuredStory, storiesLoading, storiesError, fetchStories, storiesByRegion } = useStoriesStore();
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const fetchInteractions = useInteractionsStore((s) => s.fetchInteractions);
  const t = useLocaleStore((s) => s.t);
  const disabledSources = useSettingsStore((s) => s.disabledSources);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  useEffect(() => {
    if (stories.length > 0) {
      fetchInteractions(stories.map((s) => s.id));
    }
  }, [stories, fetchInteractions]);

  // Filter out stories whose sources are all disabled
  const isStoryVisible = useCallback(
    (story: Story) => {
      if (disabledSources.length === 0) return true;
      const storySourceLabels = story.labels.filter((l) => l.type === "source").map((l) => l.text);
      if (storySourceLabels.length === 0) return true; // No source labels = always visible
      return storySourceLabels.some((s) => !disabledSources.includes(s));
    },
    [disabledSources],
  );

  const filteredFeatured = useMemo(
    () => (featuredStory && isStoryVisible(featuredStory) ? featuredStory : null),
    [featuredStory, isStoryVisible],
  );

  const regionGroups = useMemo(() => {
    const groups = storiesByRegion();
    if (disabledSources.length === 0) return groups;
    const filtered: Record<string, Story[]> = {};
    for (const [region, regionStories] of Object.entries(groups)) {
      const visible = regionStories.filter(isStoryVisible);
      if (visible.length > 0) filtered[region] = visible;
    }
    return filtered;
  }, [storiesByRegion, stories, disabledSources, isStoryVisible]);

  const sortedRegions = useMemo(() => {
    const regionOrder = ["Nordics", "EU", "Global", "Asia", "Middle East", "USA"];
    return [
      ...regionOrder.filter((r) => regionGroups[r]),
      ...Object.keys(regionGroups).filter((r) => !regionOrder.includes(r)),
    ];
  }, [regionGroups]);

  return (
    <div className="flex-1 overflow-y-auto">
      <SearchBar />

      <div className="px-6 md:px-10 lg:px-16 py-6 md:py-8">
        <div className="max-w-[960px] mx-auto">
          <Dateline />

          {needsOnboarding && <OnboardingBanner />}

          {/* Loading state */}
          {storiesLoading && stories.length === 0 && (
            <>
              <HeroSkeleton />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                <SectionSkeleton />
                <SectionSkeleton />
              </div>
            </>
          )}

          {/* Error state */}
          {storiesError && stories.length === 0 && (
            <div className="text-center py-20">
              <p className="font-serif text-lg text-stone-500 mb-4">{storiesError}</p>
              <button
                onClick={fetchStories}
                className="px-5 py-2.5 text-sm font-medium border border-stone-300 dark:border-stone-700 rounded hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
              >
                {t.common.retry}
              </button>
            </div>
          )}

          {/* Empty state */}
          {!storiesLoading && !storiesError && stories.length === 0 && (
            <div className="text-center py-20">
              <p className="font-serif text-xl text-stone-400 dark:text-stone-500">
                {t.dashboard.noIntelligenceBriefs}
              </p>
              <p className="text-sm text-stone-400 dark:text-stone-600 mt-2">{t.dashboard.pipelineMessage}</p>
            </div>
          )}

          {/* Hero story — CNN-style grab */}
          {filteredFeatured && <HeroStory story={filteredFeatured} />}

          {/* Regional sections — WSJ-style structured grid */}
          {sortedRegions.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
              {sortedRegions.map((region) => (
                <RegionSection key={region} region={region} stories={regionGroups[region] ?? []} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
