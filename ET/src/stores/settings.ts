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
    (set) => ({
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
      name: "jaegeren-settings",
      partialize: (state) => ({
        topics: state.topics,
        geographies: state.geographies,
        lenses: state.lenses,
        textSize: state.textSize,
        showCitationBrackets: state.showCitationBrackets,
      }),
    },
  ),
);
