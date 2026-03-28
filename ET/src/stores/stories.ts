import { create } from "zustand";
import type { Story } from "@/types/database";
import { supabase } from "@/lib/supabase";
import { isSupabaseConfigured } from "@/lib/supabase";

const MOCK_STORIES: Story[] = [
  {
    id: "mock-1",
    title: "EU Imposes New Sanctions on Russian Energy Sector Amid Escalating Tensions",
    synopsis:
      "The European Union has announced a comprehensive new sanctions package targeting Russia's energy infrastructure, with significant implications for Nordic energy markets and Danish shipping companies.",
    synthetic_content:
      "## Key Developments\n\nThe European Commission today unveiled its 14th sanctions package against Russia, specifically targeting the energy sector with unprecedented measures.\n\n### Impact on Nordic Markets\n\nDanish and Nordic energy companies face new compliance requirements as the sanctions extend to third-party intermediaries. **Ørsted** and **Equinor** have both issued statements reviewing their exposure.\n\n[BACKGROUND]The EU has progressively tightened sanctions since February 2022, with each package expanding the scope of restricted entities and sectors.[/BACKGROUND]\n\n### What Analysts Should Watch\n\n- LNG rerouting through non-EU ports\n- Impact on Baltic pipeline infrastructure\n- Danish shipping companies' compliance timelines",
    source_count: 8,
    source_article_ids: [],
    labels: [
      { type: "source", text: "Reuters", reason: "Original reporting source" },
      { type: "source", text: "Financial Times", reason: "Original reporting source" },
      { type: "ai", text: "Geopolitics", reason: "AI classified based on entity analysis" },
      { type: "ai", text: "Energy", reason: "AI classified based on sector analysis" },
      { type: "editorial", text: "Danish Business Impact", reason: "Story impacts Danish shipping and energy sectors" },
    ],
    cluster_topic: "EU-Russia Sanctions",
    region: "EU",
    is_featured: true,
    content_hash: "mock-hash-1",
    image_url: "https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=800&q=80",
    timeline_entries: [
      {
        timestamp: new Date().toISOString(),
        summary: "EU Commission announces 14th sanctions package",
        anchor_id: "key-developments",
      },
      {
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        summary: "Nordic energy companies review exposure",
        anchor_id: "impact-on-nordic-markets",
      },
    ],
    confidence_score: 0.92,
    sim_engagement_rate: 0.78,
    sim_predicted_virality: 0.72,
    sim_polarization_flag: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mock-2",
    title: "Novo Nordisk Expands Ozempic Production with New $3.2B Danish Facility",
    synopsis:
      "Denmark's largest company announces massive expansion of its domestic manufacturing capacity to meet surging global demand for GLP-1 weight loss drugs.",
    synthetic_content:
      "## Expansion Details\n\nNovo Nordisk has committed DKK 22 billion to a new production facility in Kalundborg, Denmark.\n\n### Market Impact\n\nThe expansion solidifies Denmark's position as the global hub for GLP-1 manufacturing.",
    source_count: 6,
    source_article_ids: [],
    labels: [
      { type: "source", text: "Børsen", reason: "Original reporting source" },
      { type: "ai", text: "Healthcare", reason: "AI classified based on sector" },
      { type: "ai", text: "Business", reason: "AI classified based on content" },
      { type: "editorial", text: "Danish Business Impact", reason: "Major Danish employer expanding domestically" },
    ],
    cluster_topic: "Novo Nordisk Expansion",
    region: "Nordics",
    is_featured: false,
    content_hash: "mock-hash-2",
    image_url: "https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=800&q=80",
    timeline_entries: [],
    confidence_score: 0.88,
    sim_engagement_rate: 0.65,
    sim_predicted_virality: 0.68,
    sim_polarization_flag: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
    updated_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "mock-3",
    title: "US-China Trade Tensions Resurface as New Tariff Threats Loom",
    synopsis:
      "Washington signals potential expansion of technology export controls, raising concerns about supply chain disruptions for European manufacturers.",
    synthetic_content:
      "## Latest Developments\n\nThe Biden administration has signaled it may expand restrictions on semiconductor equipment exports to China.\n\n### European Exposure\n\nASML and other European chipmakers face uncertainty.",
    source_count: 12,
    source_article_ids: [],
    labels: [
      { type: "source", text: "WSJ", reason: "Original reporting source" },
      { type: "source", text: "Bloomberg", reason: "Original reporting source" },
      { type: "ai", text: "Trade", reason: "AI classified based on content" },
      { type: "ai", text: "Technology", reason: "AI classified based on sector" },
      { type: "ai", text: "Geopolitics", reason: "AI classified based on entities" },
    ],
    cluster_topic: "US-China Trade",
    region: "Global",
    is_featured: false,
    content_hash: "mock-hash-3",
    image_url: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&q=80",
    timeline_entries: [],
    confidence_score: 0.85,
    sim_engagement_rate: 0.82,
    sim_predicted_virality: 0.75,
    sim_polarization_flag: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
    updated_at: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: "mock-4",
    title: "Nordic Council Proposes Joint Green Hydrogen Strategy for Scandinavia",
    synopsis:
      "A new framework for coordinated green hydrogen production across Denmark, Norway, and Sweden could reshape the region's energy transition timeline.",
    synthetic_content:
      "## Proposal Overview\n\nThe Nordic Council of Ministers has released a joint strategy paper outlining a coordinated approach to green hydrogen production.\n\n### Danish Role\n\nDenmark is positioned as the primary offshore wind-to-hydrogen hub.",
    source_count: 4,
    source_article_ids: [],
    labels: [
      { type: "source", text: "DR Nyheder", reason: "Original reporting source" },
      { type: "ai", text: "Energy", reason: "AI classified based on sector" },
      { type: "ai", text: "Climate", reason: "AI classified based on topic" },
      { type: "editorial", text: "Danish Business Impact", reason: "Denmark central to proposed strategy" },
    ],
    cluster_topic: "Nordic Green Hydrogen",
    region: "Nordics",
    is_featured: false,
    content_hash: "mock-hash-4",
    image_url: null,
    timeline_entries: [],
    confidence_score: 0.78,
    sim_engagement_rate: null,
    sim_predicted_virality: null,
    sim_polarization_flag: false,
    created_at: new Date(Date.now() - 10800000).toISOString(),
    updated_at: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: "mock-5",
    title: "Middle East Shipping Disruptions Drive Insurance Costs to Record Highs",
    synopsis:
      "Houthi attacks in the Red Sea continue to impact global shipping routes, with Maersk and other Danish carriers rerouting around the Cape of Good Hope.",
    synthetic_content:
      "## Current Situation\n\nShipping insurance premiums for Red Sea transit have surged 300% since November.\n\n### Maersk Impact\n\nA.P. Møller-Maersk has confirmed all vessels are now routing via the Cape of Good Hope, adding 10-14 days to Europe-Asia transit times.",
    source_count: 7,
    source_article_ids: [],
    labels: [
      { type: "source", text: "Reuters", reason: "Original reporting source" },
      { type: "ai", text: "Trade", reason: "AI classified based on content" },
      { type: "ai", text: "Defense", reason: "AI classified based on entities" },
      { type: "editorial", text: "Danish Business Impact", reason: "Maersk directly affected" },
    ],
    cluster_topic: "Red Sea Shipping Crisis",
    region: "Middle East",
    is_featured: false,
    content_hash: "mock-hash-5",
    image_url: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80",
    timeline_entries: [],
    confidence_score: 0.9,
    sim_engagement_rate: 0.71,
    sim_predicted_virality: 0.84,
    sim_polarization_flag: true,
    created_at: new Date(Date.now() - 14400000).toISOString(),
    updated_at: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: "mock-6",
    title: "ECB Signals Rate Cut Path as Eurozone Inflation Falls Below Target",
    synopsis:
      "European Central Bank officials hint at accelerated rate cuts, with implications for Nordic currencies and Danish mortgage rates.",
    synthetic_content:
      "## ECB Guidance\n\nMultiple ECB governing council members have signaled openness to faster rate reductions.\n\n### Nordic Impact\n\nDanish fixed-rate mortgage bonds are already pricing in two additional cuts this year.",
    source_count: 5,
    source_article_ids: [],
    labels: [
      { type: "source", text: "Financial Times", reason: "Original reporting source" },
      { type: "ai", text: "Economics", reason: "AI classified based on content" },
      { type: "ai", text: "Finance", reason: "AI classified based on sector" },
    ],
    cluster_topic: "ECB Monetary Policy",
    region: "EU",
    is_featured: false,
    content_hash: "mock-hash-6",
    image_url: null,
    timeline_entries: [],
    confidence_score: 0.82,
    sim_engagement_rate: 0.55,
    sim_predicted_virality: 0.48,
    sim_polarization_flag: false,
    created_at: new Date(Date.now() - 18000000).toISOString(),
    updated_at: new Date(Date.now() - 18000000).toISOString(),
  },
];

type StoriesState = {
  stories: Story[];
  featuredStory: Story | null;
  storiesLoading: boolean;
  storiesError: string | null;
  fetchStories: () => Promise<void>;
  storiesByRegion: () => Record<string, Story[]>;
};

export const useStoriesStore = create<StoriesState>((set, get) => ({
  stories: [],
  featuredStory: null,
  storiesLoading: false,
  storiesError: null,

  fetchStories: async () => {
    set({ storiesLoading: true, storiesError: null });

    // Dev mode: use mock stories when Supabase is not configured
    if (!isSupabaseConfigured()) {
      const stories = MOCK_STORIES;
      const featuredStory = stories.find((s) => s.is_featured) ?? stories[0] ?? null;
      set({ stories, featuredStory, storiesLoading: false });
      return;
    }

    try {
      const since = new Date();
      since.setHours(since.getHours() - 48);

      // Try recent stories first (last 48h)
      let result = await supabase
        .from("stories")
        .select("*")
        .gte("created_at", since.toISOString())
        .order("is_featured", { ascending: false })
        .order("source_count", { ascending: false })
        .order("confidence_score", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(80);

      if (result.error) throw result.error;

      // Fallback: if no recent stories, fetch the latest regardless of age
      if (!result.data || result.data.length === 0) {
        result = await supabase
          .from("stories")
          .select("*")
          .order("is_featured", { ascending: false })
          .order("source_count", { ascending: false })
          .order("confidence_score", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(80);

        if (result.error) throw result.error;
      }

      const stories = (result.data ?? []) as Story[];
      const featuredStory = stories.find((s) => s.is_featured) ?? stories[0] ?? null;

      set({ stories, featuredStory, storiesLoading: false });
    } catch (e) {
      set({
        storiesError: e instanceof Error ? e.message : "Failed to fetch stories",
        storiesLoading: false,
      });
    }
  },

  storiesByRegion: () => {
    const { stories, featuredStory } = get();
    const grouped: Record<string, Story[]> = {};

    for (const story of stories) {
      if (featuredStory && story.id === featuredStory.id) continue;
      const region = story.region || "Global";
      if (!grouped[region]) grouped[region] = [];
      grouped[region].push(story);
    }

    return grouped;
  },
}));
