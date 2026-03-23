import { useEffect, useState, useCallback } from "react";
import { Brain, RefreshCw, X } from "lucide-react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { Skeleton } from "@/app/components/ui/skeleton";
import { toast } from "sonner";

type AiProfile = {
  id: string;
  user_id: string;
  inferred_interests: string[];
  avoided_topics: string[];
  preferred_depth: "deep_analysis" | "quick_scan" | "balanced";
  geographic_focus: string[];
  industry_focus: string[];
  lens_preferences: string[];
  preference_overrides: Record<string, unknown>;
  last_generated_at: string;
  created_at: string;
};

export function AiProfileSettings() {
  const user = useAuthStore((s) => s.user);
  const [profile, setProfile] = useState<AiProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [regenerating, setRegenerating] = useState(false);
  const [interactionCount, setInteractionCount] = useState(0);

  const fetchProfile = useCallback(async () => {
    if (!user || !isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("ai_user_profiles")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      setProfile(data as AiProfile | null);

      // Count interactions
      const { count } = await supabase
        .from("user_interactions")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      setInteractionCount(count ?? 0);
    } catch {
      // No profile yet
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const handleRegenerate = async () => {
    if (!user || regenerating) return;
    setRegenerating(true);
    try {
      // Fetch user's interactions to build profile
      const { data: interactions } = await supabase
        .from("user_interactions")
        .select("story_id, interaction_type")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!interactions || interactions.length < 3) {
        toast.error("Need at least 3 story interactions to generate a profile");
        return;
      }

      // Fetch stories for liked/bookmarked items
      const likedIds = interactions
        .filter((i) => i.interaction_type === "like" || i.interaction_type === "bookmark")
        .map((i) => i.story_id);
      const dislikedIds = interactions.filter((i) => i.interaction_type === "dislike").map((i) => i.story_id);

      const { data: likedStories } = await supabase
        .from("stories")
        .select("cluster_topic, region, labels")
        .in("id", likedIds.length > 0 ? likedIds : ["none"]);

      const { data: dislikedStories } = await supabase
        .from("stories")
        .select("cluster_topic, region, labels")
        .in("id", dislikedIds.length > 0 ? dislikedIds : ["none"]);

      // Build profile from interaction patterns
      const topicCounts: Record<string, number> = {};
      const regionCounts: Record<string, number> = {};
      const avoidedTopics: Set<string> = new Set();

      for (const s of likedStories || []) {
        const topic = (s as { cluster_topic?: string }).cluster_topic || "General";
        topicCounts[topic] = (topicCounts[topic] || 0) + 1;
        const region = (s as { region?: string }).region || "Global";
        regionCounts[region] = (regionCounts[region] || 0) + 1;
      }

      for (const s of dislikedStories || []) {
        const topic = (s as { cluster_topic?: string }).cluster_topic || "General";
        avoidedTopics.add(topic);
      }

      const sortedTopics = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([t]) => t);
      const sortedRegions = Object.entries(regionCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([r]) => r);

      // Fetch user preferences for lens info
      const { data: prefs } = await supabase
        .from("user_preferences")
        .select("preference_type, preference_value")
        .eq("user_id", user.id);

      const lenses = (prefs || []).filter((p) => p.preference_type === "lens").map((p) => p.preference_value);

      const newProfile = {
        user_id: user.id,
        inferred_interests: sortedTopics,
        avoided_topics: Array.from(avoidedTopics),
        preferred_depth: interactionCount > 20 ? "deep_analysis" : "balanced",
        geographic_focus: sortedRegions.length > 0 ? sortedRegions : ["Global"],
        industry_focus: sortedTopics.slice(0, 5),
        lens_preferences: lenses,
        preference_overrides: profile?.preference_overrides || {},
        last_generated_at: new Date().toISOString(),
      };

      // Upsert profile
      const { data: inserted, error } = await supabase
        .from("ai_user_profiles")
        .upsert(newProfile, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;
      setProfile(inserted as AiProfile);
      toast.success("AI profile regenerated");
    } catch (_err) {
      toast.error("Failed to regenerate profile");
    } finally {
      setRegenerating(false);
    }
  };

  const removeItem = async (field: keyof AiProfile, value: string) => {
    if (!profile) return;
    const current = (profile[field] as string[]) || [];
    const updated = current.filter((v) => v !== value);

    const overrides = {
      ...(profile.preference_overrides || {}),
      [`removed_${field}`]: [
        ...((profile.preference_overrides as Record<string, string[]>)?.[`removed_${field}`] || []),
        value,
      ],
    };

    await supabase
      .from("ai_user_profiles")
      .update({ [field]: updated, preference_overrides: overrides })
      .eq("id", profile.id);

    setProfile({ ...profile, [field]: updated, preference_overrides: overrides });
    toast.success(`Removed "${value}"`);
  };

  if (loading) {
    return (
      <div className="max-w-2xl space-y-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Brain className="size-5 text-stone-500" />
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">My AI Profile</h2>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={regenerating}
          className="flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-stone-200 dark:border-stone-700 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${regenerating ? "animate-spin" : ""}`} />
          {regenerating ? "Regenerating..." : "Regenerate"}
        </button>
      </div>

      {!profile ? (
        <div className="rounded-lg border border-stone-200 dark:border-stone-800 p-8 text-center">
          <Brain className="size-10 text-stone-300 dark:text-stone-700 mx-auto mb-3" />
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-1">No AI profile yet</p>
          <p className="text-xs text-stone-400 dark:text-stone-600 mb-4">
            Your profile will generate after you interact with stories ({interactionCount}/3 interactions).
          </p>
          {interactionCount >= 3 && (
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="px-4 py-2 text-sm bg-stone-900 dark:bg-white text-white dark:text-stone-900 rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Generate Profile Now
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Last updated */}
          <p className="text-xs text-stone-400">
            Last updated:{" "}
            {new Date(profile.last_generated_at).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* Inferred interests */}
          <ProfileSection
            title="Inferred Interests"
            items={profile.inferred_interests}
            onRemove={(v) => removeItem("inferred_interests", v)}
            color="blue"
          />

          {/* Geographic focus */}
          <ProfileSection
            title="Geographic Focus"
            items={profile.geographic_focus}
            onRemove={(v) => removeItem("geographic_focus", v)}
            color="green"
          />

          {/* Industry focus */}
          <ProfileSection
            title="Industry Focus"
            items={profile.industry_focus}
            onRemove={(v) => removeItem("industry_focus", v)}
            color="amber"
          />

          {/* Avoided topics */}
          {profile.avoided_topics.length > 0 && (
            <ProfileSection
              title="Avoided Topics"
              items={profile.avoided_topics}
              onRemove={(v) => removeItem("avoided_topics", v)}
              color="red"
            />
          )}

          {/* Lens preferences */}
          {profile.lens_preferences.length > 0 && (
            <ProfileSection
              title="Analysis Lenses"
              items={profile.lens_preferences}
              onRemove={(v) => removeItem("lens_preferences", v)}
              color="purple"
            />
          )}

          {/* Preferred depth */}
          <div>
            <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">Preferred Depth</h3>
            <span className="inline-block px-3 py-1 text-sm rounded-full bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300">
              {profile.preferred_depth.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}

function ProfileSection({
  title,
  items,
  onRemove,
  color,
}: {
  title: string;
  items: string[];
  onRemove: (v: string) => void;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300",
    green: "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300",
    amber: "bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300",
    red: "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300",
  };

  return (
    <div>
      <h3 className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-2">{title}</h3>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span
            key={item}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-sm rounded-full ${colorMap[color] || colorMap.blue}`}
          >
            {item}
            <button
              onClick={() => onRemove(item)}
              className="hover:opacity-60 transition-opacity"
              title={`Remove "${item}"`}
            >
              <X className="size-3" />
            </button>
          </span>
        ))}
        {items.length === 0 && <span className="text-xs text-stone-400">None yet</span>}
      </div>
    </div>
  );
}
