import { create } from "zustand";
import { persist } from "zustand/middleware";
import { en, type Translations } from "@/lib/i18n/en";
import { da } from "@/lib/i18n/da";

export type Locale = "en" | "da";

const translations: Record<Locale, Translations> = { en, da };

type LocaleState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translations;
};

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: "en",
      setLocale: (locale: Locale) => {
        document.documentElement.lang = locale;
        set({ locale, t: translations[locale] });
      },
      t: translations["en"],
    }),
    {
      name: "jaegeren-locale",
      version: 3,
      migrate: () => ({ locale: "en" as Locale }),
      partialize: (state) => ({ locale: state.locale }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.t = translations[state.locale];
          document.documentElement.lang = state.locale;
        }
      },
    },
  ),
);
