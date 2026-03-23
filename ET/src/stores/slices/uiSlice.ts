import type { StateCreator } from "zustand";
import type { AppState } from "@/stores/app";

export type UISlice = {
  // Mobile layout
  leftNavOpen: boolean;
  toggleLeftNav: () => void;
  rightSidebarOpen: boolean;
  toggleRightSidebar: () => void;
  closeAllPanels: () => void;

  // Error management
  clearError: () => void;

  // Reset all state (called on sign-out)
  resetStore: () => void;
};

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  leftNavOpen: true,
  rightSidebarOpen: true,

  toggleLeftNav: () => {
    set((state) => ({ leftNavOpen: !state.leftNavOpen }));
  },

  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }));
  },

  closeAllPanels: () => {
    set({ leftNavOpen: false, rightSidebarOpen: false });
  },

  clearError: () => {
    set({ queryError: null });
  },

  resetStore: () => {
    set({
      sources: [],
      sourcesLoading: false,
      currentQuery: null,
      queryLoading: false,
      queryError: null,
      loadingPhase: null,
      recentQueries: [],
      recentArticles: [],
      queryCountToday: 0,
      selectedSource: null,
      sourceArticles: [],
      sourceArticlesLoading: false,
      leftNavOpen: true,
      rightSidebarOpen: true,
      lastIngestionTime: null,
      totalArticleCount: 0,
    });
  },
});
