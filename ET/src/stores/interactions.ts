import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";

type InteractionType = "like" | "dislike" | "bookmark";

type InteractionsState = {
  interactions: Map<string, InteractionType | null>;
  bookmarks: Set<string>;
  fetchInteractions: (storyIds: string[]) => Promise<void>;
  toggleLike: (storyId: string) => Promise<void>;
  toggleDislike: (storyId: string) => Promise<void>;
  toggleBookmark: (storyId: string) => Promise<void>;
  getInteraction: (storyId: string) => "like" | "dislike" | null;
  isBookmarked: (storyId: string) => boolean;
};

export const useInteractionsStore = create<InteractionsState>((set, get) => ({
  interactions: new Map(),
  bookmarks: new Set(),

  fetchInteractions: async (storyIds: string[]) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId || storyIds.length === 0) return;

    const { data } = await supabase
      .from("user_interactions")
      .select("story_id, interaction_type")
      .eq("user_id", userId)
      .in("story_id", storyIds);

    const interactions = new Map(get().interactions);
    const bookmarks = new Set(get().bookmarks);

    for (const row of data ?? []) {
      const type = row.interaction_type as InteractionType;
      if (type === "bookmark") {
        bookmarks.add(row.story_id);
      } else {
        interactions.set(row.story_id, type);
      }
    }

    set({ interactions, bookmarks });
  },

  toggleLike: async (storyId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const current = get().interactions.get(storyId);
    const interactions = new Map(get().interactions);

    if (current === "like") {
      // Remove like
      interactions.set(storyId, null);
      set({ interactions });
      await supabase
        .from("user_interactions")
        .delete()
        .eq("user_id", userId)
        .eq("story_id", storyId)
        .eq("interaction_type", "like");
    } else {
      // Set like (remove dislike if exists)
      interactions.set(storyId, "like");
      set({ interactions });
      if (current === "dislike") {
        await supabase
          .from("user_interactions")
          .delete()
          .eq("user_id", userId)
          .eq("story_id", storyId)
          .eq("interaction_type", "dislike");
      }
      await supabase
        .from("user_interactions")
        .upsert(
          { user_id: userId, story_id: storyId, interaction_type: "like" },
          { onConflict: "user_id,story_id,interaction_type" },
        );
    }
  },

  toggleDislike: async (storyId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const current = get().interactions.get(storyId);
    const interactions = new Map(get().interactions);

    if (current === "dislike") {
      interactions.set(storyId, null);
      set({ interactions });
      await supabase
        .from("user_interactions")
        .delete()
        .eq("user_id", userId)
        .eq("story_id", storyId)
        .eq("interaction_type", "dislike");
    } else {
      interactions.set(storyId, "dislike");
      set({ interactions });
      if (current === "like") {
        await supabase
          .from("user_interactions")
          .delete()
          .eq("user_id", userId)
          .eq("story_id", storyId)
          .eq("interaction_type", "like");
      }
      await supabase
        .from("user_interactions")
        .upsert(
          { user_id: userId, story_id: storyId, interaction_type: "dislike" },
          { onConflict: "user_id,story_id,interaction_type" },
        );
    }
  },

  toggleBookmark: async (storyId: string) => {
    const userId = useAuthStore.getState().user?.id;
    if (!userId) return;

    const bookmarks = new Set(get().bookmarks);

    if (bookmarks.has(storyId)) {
      bookmarks.delete(storyId);
      set({ bookmarks });
      await supabase
        .from("user_interactions")
        .delete()
        .eq("user_id", userId)
        .eq("story_id", storyId)
        .eq("interaction_type", "bookmark");
    } else {
      bookmarks.add(storyId);
      set({ bookmarks });
      await supabase
        .from("user_interactions")
        .upsert(
          { user_id: userId, story_id: storyId, interaction_type: "bookmark" },
          { onConflict: "user_id,story_id,interaction_type" },
        );
    }
  },

  getInteraction: (storyId: string) => {
    return get().interactions.get(storyId) ?? null;
  },

  isBookmarked: (storyId: string) => {
    return get().bookmarks.has(storyId);
  },
}));
