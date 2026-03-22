import { create } from "zustand";
import type { Story, ChatMessage, StoryVersion, CanvasSession } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { useStoriesStore } from "@/stores/stories";

type CanvasState = {
  // Story
  currentStory: Story | null;
  storyLoading: boolean;
  storyError: string | null;

  // Chat
  chatMessages: ChatMessage[];
  chatLoading: boolean;

  // Story versioning
  storyVersions: StoryVersion[];
  currentContent: string | null;

  // Session
  sessionId: string | null;
  previousSessions: CanvasSession[];

  // Actions
  loadStory: (storyId: string) => Promise<void>;
  loadSession: (sessionId: string) => Promise<void>;
  fetchPreviousSessions: (storyId: string) => Promise<void>;
  addUserMessage: (content: string) => void;
  addAssistantMessage: (content: string) => void;
  setChatLoading: (loading: boolean) => void;
  updateStoryContent: (content: string) => void;
  undoStoryChange: () => void;
  saveSession: () => Promise<void>;
  resetCanvas: () => void;
};

export const useCanvasStore = create<CanvasState>((set, get) => ({
  currentStory: null,
  storyLoading: false,
  storyError: null,
  chatMessages: [],
  chatLoading: false,
  storyVersions: [],
  currentContent: null,
  sessionId: null,
  previousSessions: [],

  loadStory: async (storyId: string) => {
    set({ storyLoading: true, storyError: null });
    try {
      let story: Story | null = null;

      if (!isSupabaseConfigured()) {
        // Dev mode: find from stories store mock data
        const allStories = useStoriesStore.getState().stories;
        story = allStories.find((s) => s.id === storyId) ?? null;
      } else {
        const { data, error } = await supabase
          .from("stories")
          .select("*")
          .eq("id", storyId)
          .single();
        if (error) throw error;
        story = data as Story;
      }

      if (!story) throw new Error("Story not found");
      set({
        currentStory: story,
        currentContent: story.synthetic_content,
        storyVersions: [
          {
            content: story.synthetic_content ?? "",
            timestamp: story.updated_at,
            version: 0,
          },
        ],
        storyLoading: false,
        chatMessages: [],
        sessionId: null,
      });

      // Fetch previous sessions in background
      get().fetchPreviousSessions(storyId);
    } catch (e) {
      set({
        storyError: e instanceof Error ? e.message : "Failed to load story",
        storyLoading: false,
      });
    }
  },

  loadSession: async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from("canvas_sessions")
        .select("*")
        .eq("id", sessionId)
        .single();

      if (error || !data) return;

      const session = data as CanvasSession;
      const lastVersion = session.story_versions[session.story_versions.length - 1];

      set({
        sessionId: session.id,
        chatMessages: session.messages,
        storyVersions: session.story_versions,
        currentContent: lastVersion?.content ?? get().currentStory?.synthetic_content ?? null,
      });
    } catch {
      // Fail silently — session restore is non-critical
    }
  },

  fetchPreviousSessions: async (storyId: string) => {
    try {
      const user = useAuthStore.getState().user;
      if (!user) return;

      const { data } = await supabase
        .from("canvas_sessions")
        .select("*")
        .eq("user_id", user.id)
        .eq("story_id", storyId)
        .order("updated_at", { ascending: false })
        .limit(10);

      set({ previousSessions: (data ?? []) as CanvasSession[] });
    } catch {
      set({ previousSessions: [] });
    }
  },

  addUserMessage: (content: string) => {
    const msg: ChatMessage = {
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ chatMessages: [...s.chatMessages, msg] }));
  },

  addAssistantMessage: (content: string) => {
    const msg: ChatMessage = {
      role: "assistant",
      content,
      timestamp: new Date().toISOString(),
    };
    set((s) => ({ chatMessages: [...s.chatMessages, msg] }));
  },

  setChatLoading: (loading: boolean) => {
    set({ chatLoading: loading });
  },

  updateStoryContent: (content: string) => {
    set((s) => ({
      currentContent: content,
      storyVersions: [
        ...s.storyVersions,
        {
          content,
          timestamp: new Date().toISOString(),
          version: s.storyVersions.length,
        },
      ],
    }));
  },

  undoStoryChange: () => {
    set((s) => {
      if (s.storyVersions.length <= 1) return s;
      const previous = s.storyVersions.slice(0, -1);
      return {
        storyVersions: previous,
        currentContent: previous[previous.length - 1].content,
      };
    });
  },

  saveSession: async () => {
    const { currentStory, chatMessages, storyVersions, sessionId } = get();
    const user = useAuthStore.getState().user;
    if (!user || !currentStory || chatMessages.length === 0) return;

    try {
      if (sessionId) {
        await supabase
          .from("canvas_sessions")
          .update({
            messages: chatMessages as unknown as Record<string, unknown>[],
            story_versions: storyVersions as unknown as Record<string, unknown>[],
          })
          .eq("id", sessionId);
      } else {
        const { data } = await supabase
          .from("canvas_sessions")
          .insert({
            user_id: user.id,
            story_id: currentStory.id,
            messages: chatMessages as unknown as Record<string, unknown>[],
            story_versions: storyVersions as unknown as Record<string, unknown>[],
          })
          .select("id")
          .single();

        if (data) set({ sessionId: data.id });
      }
    } catch {
      // Non-critical — session will save on next interaction
    }
  },

  resetCanvas: () => {
    set({
      currentStory: null,
      storyLoading: false,
      storyError: null,
      chatMessages: [],
      chatLoading: false,
      storyVersions: [],
      currentContent: null,
      sessionId: null,
      previousSessions: [],
    });
  },
}));
