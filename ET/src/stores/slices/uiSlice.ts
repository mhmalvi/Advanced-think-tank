import type { StateCreator } from "zustand";
import type { AppState } from "@/stores/app";

export type UISlice = {
  // Mobile layout
  leftNavOpen: boolean;
  rightSidebarOpen: boolean;
  toggleLeftNav: () => void;
  toggleRightSidebar: () => void;
  closeAllPanels: () => void;

  // Error management
  clearError: () => void;

  // View modes
  showSavedQueries: boolean;
  setShowSavedQueries: (show: boolean) => void;

  // Home navigation
  goHome: () => void;

  // Reset all state (called on sign-out)
  resetStore: () => void;
};

export const createUISlice: StateCreator<AppState, [], [], UISlice> = (set) => ({
  leftNavOpen: true,
  rightSidebarOpen: false,

  toggleLeftNav: () => {
    set((state) => ({ leftNavOpen: !state.leftNavOpen }));
  },

  toggleRightSidebar: () => {
    set((state) => ({ rightSidebarOpen: !state.rightSidebarOpen }));
  },

  /** Closes both the left nav and right sidebar panels (used on mobile overlay dismiss). */
  closeAllPanels: () => {
    set({ leftNavOpen: false, rightSidebarOpen: false });
  },

  showSavedQueries: false,
  setShowSavedQueries: (show: boolean) => {
    set({ showSavedQueries: show, selectedSource: null, currentQuery: null, queryError: null });
  },

  clearError: () => {
    set({ queryError: null });
  },

  /** Resets query, loading, error, source browsing, and saved-queries view to return to the home/overview state. */
  goHome: () => {
    set({
      currentQuery: null,
      queryError: null,
      queryLoading: false,
      loadingPhase: null,
      selectedSource: null,
      sourceArticles: [],
      showSavedQueries: false,
    });
  },

  /** Resets all app state to initial values — called on sign-out to clear user-scoped data. */
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
      showAllSources: false,
      showSavedQueries: false,
      leftNavOpen: true,
      rightSidebarOpen: false,
      lastIngestionTime: null,
      totalArticleCount: 0,
    });
  },
});
