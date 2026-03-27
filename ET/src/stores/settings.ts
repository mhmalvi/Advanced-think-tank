import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Lens = {
  id: string;
  name: string;
  prompt: string;
};

type SettingsState = {
  // Topics the user wants to follow
  topics: string[];
  addTopic: (topic: string) => void;
  removeTopic: (topic: string) => void;

  // Geographies to focus on
  geographies: string[];
  addGeography: (geo: string) => void;
  removeGeography: (geo: string) => void;

  // Industries to focus on
  industries: string[];
  addIndustry: (industry: string) => void;
  removeIndustry: (industry: string) => void;

  // Preferred news sources (text tags)
  preferredSources: string[];
  addPreferredSource: (source: string) => void;
  removePreferredSource: (source: string) => void;

  // Disabled source feeds (source names toggled off)
  disabledSources: string[];
  toggleSource: (sourceName: string) => void;
  isSourceEnabled: (sourceName: string) => boolean;

  // Saved prompts
  savedPrompts: string[];
  addSavedPrompt: (prompt: string) => void;
  removeSavedPrompt: (prompt: string) => void;

  // Notification preferences
  notificationsEnabled: boolean;
  notifyBreakingNews: boolean;
  notifyWeeklySummary: boolean;
  toggleNotifications: () => void;
  toggleBreakingNews: () => void;
  toggleWeeklySummary: () => void;

  // Analytical lenses
  lenses: Lens[];
  addLens: (name: string, prompt: string) => void;
  removeLens: (id: string) => void;

  // UI preferences
  textSize: "sm" | "md" | "lg";
  setTextSize: (size: "sm" | "md" | "lg") => void;
  showCitationBrackets: boolean;
  toggleCitationBrackets: () => void;
};

function generateId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      topics: [],
      addTopic: (topic: string) => {
        const trimmed = topic.trim();
        if (!trimmed) return;
        set((state) => ({
          topics: state.topics.includes(trimmed) ? state.topics : [...state.topics, trimmed],
        }));
      },
      removeTopic: (topic: string) => {
        set((state) => ({ topics: state.topics.filter((t) => t !== topic) }));
      },

      geographies: [],
      addGeography: (geo: string) => {
        const trimmed = geo.trim();
        if (!trimmed) return;
        set((state) => ({
          geographies: state.geographies.includes(trimmed) ? state.geographies : [...state.geographies, trimmed],
        }));
      },
      removeGeography: (geo: string) => {
        set((state) => ({ geographies: state.geographies.filter((g) => g !== geo) }));
      },

      industries: [],
      addIndustry: (industry: string) => {
        const trimmed = industry.trim();
        if (!trimmed) return;
        set((state) => ({
          industries: state.industries.includes(trimmed) ? state.industries : [...state.industries, trimmed],
        }));
      },
      removeIndustry: (industry: string) => {
        set((state) => ({ industries: state.industries.filter((i) => i !== industry) }));
      },

      preferredSources: [],
      addPreferredSource: (source: string) => {
        const trimmed = source.trim();
        if (!trimmed) return;
        set((state) => ({
          preferredSources: state.preferredSources.includes(trimmed)
            ? state.preferredSources
            : [...state.preferredSources, trimmed],
        }));
      },
      removePreferredSource: (source: string) => {
        set((state) => ({ preferredSources: state.preferredSources.filter((s) => s !== source) }));
      },

      disabledSources: [],
      toggleSource: (sourceName: string) => {
        set((state) => ({
          disabledSources: state.disabledSources.includes(sourceName)
            ? state.disabledSources.filter((s) => s !== sourceName)
            : [...state.disabledSources, sourceName],
        }));
      },
      isSourceEnabled: (sourceName: string) => {
        // Convenience method — actual check: !disabledSources.includes(name)
        return !get().disabledSources.includes(sourceName);
      },

      savedPrompts: [],
      addSavedPrompt: (prompt: string) => {
        const trimmed = prompt.trim();
        if (!trimmed) return;
        set((state) => ({
          savedPrompts: state.savedPrompts.includes(trimmed) ? state.savedPrompts : [...state.savedPrompts, trimmed],
        }));
      },
      removeSavedPrompt: (prompt: string) => {
        set((state) => ({ savedPrompts: state.savedPrompts.filter((p) => p !== prompt) }));
      },

      notificationsEnabled: true,
      notifyBreakingNews: true,
      notifyWeeklySummary: false,
      toggleNotifications: () => set((state) => ({ notificationsEnabled: !state.notificationsEnabled })),
      toggleBreakingNews: () => set((state) => ({ notifyBreakingNews: !state.notifyBreakingNews })),
      toggleWeeklySummary: () => set((state) => ({ notifyWeeklySummary: !state.notifyWeeklySummary })),

      lenses: [],
      addLens: (name: string, prompt: string) => {
        const trimmedName = name.trim();
        const trimmedPrompt = prompt.trim();
        if (!trimmedName || !trimmedPrompt) return;
        set((state) => ({
          lenses: [...state.lenses, { id: generateId(), name: trimmedName, prompt: trimmedPrompt }],
        }));
      },
      removeLens: (id: string) => {
        set((state) => ({ lenses: state.lenses.filter((l) => l.id !== id) }));
      },

      textSize: "md" as "sm" | "md" | "lg",
      setTextSize: (size: "sm" | "md" | "lg") => set({ textSize: size }),
      showCitationBrackets: true,
      toggleCitationBrackets: () => {
        set((state) => ({ showCitationBrackets: !state.showCitationBrackets }));
      },
    }),
    {
      name: "advanced-think-tank-settings",
      partialize: (state) => ({
        topics: state.topics,
        geographies: state.geographies,
        industries: state.industries,
        preferredSources: state.preferredSources,
        disabledSources: state.disabledSources,
        savedPrompts: state.savedPrompts,
        notificationsEnabled: state.notificationsEnabled,
        notifyBreakingNews: state.notifyBreakingNews,
        notifyWeeklySummary: state.notifyWeeklySummary,
        lenses: state.lenses,
        textSize: state.textSize,
        showCitationBrackets: state.showCitationBrackets,
      }),
    },
  ),
);
