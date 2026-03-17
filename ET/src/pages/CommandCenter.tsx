import { useState, useMemo } from "react";
import { LiveTicker } from "@/app/components/LiveTicker";
import { CategoryNav } from "@/app/components/CategoryNav";
import { TriageFilterBar } from "@/app/components/TriageFilterBar";
import { TriageCard } from "@/app/components/TriageCard";
import { ParkingLot, BookmarkedItem } from "@/app/components/ParkingLot";
import { OmniPromptBar } from "@/app/components/OmniPromptBar";
import { useAppStore } from "@/stores/app";
import { getSourceSector, getUrgencyFromAge, getRelativeTime } from "@/lib/sectorColors";
import { useLocaleStore } from "@/stores/locale";
import type { TriageData } from "@/app/data/mockTriageData";

export function CommandCenter() {
  const { t } = useLocaleStore();
  const [confidenceThreshold, setConfidenceThreshold] = useState(0);
  const [isCompactMode, setIsCompactMode] = useState(false);

  const recentArticles = useAppStore((s) => s.recentArticles);
  const sources = useAppStore((s) => s.sources);

  // Map real articles to TriageData shape
  const triageData: TriageData[] = useMemo(() => {
    // Build a source article count map for "confidence" approximation
    const sourceCountMap = new Map<string, number>();
    for (const s of sources) {
      sourceCountMap.set(s.name, s.article_count);
    }

    return recentArticles.map((article, i) => {
      const sector = getSourceSector(article.source_name);
      const urgency = getUrgencyFromAge(article.published_at);

      // Derive a confidence score: newer + more source articles = higher confidence
      const sourceArticles = sourceCountMap.get(article.source_name) ?? 1;
      const recencyBoost = urgency === "critical" ? 30 : urgency === "high" ? 20 : urgency === "medium" ? 10 : 0;
      const confidence = Math.min(99, Math.floor(40 + recencyBoost + Math.min(30, sourceArticles / 5)));

      // Use real image_url if available, otherwise generate a deterministic placeholder for high-confidence items
      const hashSeed = article.id.replace(/-/g, "").slice(0, 8);
      const numericSeed = parseInt(hashSeed, 16) % 1000;
      const imageUrl = article.image_url
        ?? (confidence >= 85 ? `https://picsum.photos/seed/${numericSeed}/400/300` : undefined);

      return {
        id: article.id,
        headline: article.title,
        tldr: article.excerpt ?? undefined,
        imageUrl,
        sector,
        region: "Global",
        entities: [article.source_name.substring(0, 6).toUpperCase()],
        metrics: {
          sourceCount: sourceArticles,
          confidence,
          urgency,
        },
        timestamp: getRelativeTime(article.published_at),
      } satisfies TriageData;
    });
  }, [recentArticles, sources]);

  const [bookmarkedItems, setBookmarkedItems] = useState<BookmarkedItem[]>([]);

  const toggleBookmark = (id: string, e: React.MouseEvent) => {
    e.preventDefault();

    setBookmarkedItems(prev => {
      const exists = prev.find(item => item.id === id);
      if (exists) {
        return prev.filter(item => item.id !== id);
      }
      const newItem = triageData.find(item => item.id === id);
      if (newItem) {
        const expiry = new Date();
        expiry.setHours(expiry.getHours() + 6);
        return [{ ...newItem, expiresAt: expiry.toISOString() }, ...prev];
      }
      return prev;
    });
  };

  const filteredData = triageData.filter((item) => item.metrics.confidence >= confidenceThreshold);

  return (
    <div className="flex-1 overflow-y-auto bg-stone-100 dark:bg-black flex flex-col no-scrollbar">
      <LiveTicker />
      <CategoryNav />
      <OmniPromptBar />

      <TriageFilterBar
        confidenceThreshold={confidenceThreshold}
        setConfidenceThreshold={setConfidenceThreshold}
        isCompactMode={isCompactMode}
        setIsCompactMode={setIsCompactMode}
      />

      <ParkingLot
        items={bookmarkedItems}
        onRemove={toggleBookmark}
      />

      <div className="p-4 md:p-6 lg:p-8">
        <div className="max-w-[1800px] mx-auto min-h-full">

          <div className="mb-6 flex items-end justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
            <h1 className="text-2xl font-black text-stone-900 dark:text-stone-100 tracking-tighter uppercase">
              {t.feed.triageFeed} <span className="text-[#E94E3D] ml-2">{filteredData.length}</span>
            </h1>
            <span className="text-xs font-mono text-stone-500 uppercase">{t.feed.liveOutput}</span>
          </div>

          {filteredData.length === 0 && recentArticles.length === 0 ? (
            <div className="col-span-full p-24 text-center text-stone-500 font-mono text-sm">
              Loading articles from database...
            </div>
          ) : isCompactMode ? (
            <div className="flex flex-col bg-white dark:bg-[#0a0a0b] border border-stone-200 dark:border-stone-800 rounded-lg overflow-hidden shadow-sm">
               {filteredData.map((item) => (
                 <TriageCard
                   key={item.id}
                   data={item}
                   forceCompact={true}
                   isBookmarked={bookmarkedItems.some(b => b.id === item.id)}
                   onToggleBookmark={toggleBookmark}
                 />
               ))}
               {filteredData.length === 0 && (
                 <div className="p-12 text-center text-stone-500 font-mono text-sm">{t.feed.noMatches}</div>
               )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 auto-rows-min">
              {filteredData.map((item) => (
                <div key={item.id} className={item.metrics.confidence >= 85 ? 'md:col-span-2 lg:col-span-2 xl:col-span-2' : 'col-span-1'}>
                   <TriageCard
                     data={item}
                     forceCompact={false}
                     isBookmarked={bookmarkedItems.some(b => b.id === item.id)}
                     onToggleBookmark={toggleBookmark}
                   />
                </div>
              ))}
               {filteredData.length === 0 && recentArticles.length > 0 && (
                 <div className="col-span-full p-24 text-center text-stone-500 font-mono text-sm">{t.feed.noMatches}</div>
               )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
