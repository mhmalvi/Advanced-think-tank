import { useLocaleStore } from "@/stores/locale";

function getIntlLocale(): string {
  const locale = useLocaleStore.getState().locale;
  return locale === "da" ? "da-DK" : "en-US";
}

export function formatNumber(value: number, decimals: number = 0): string {
  return new Intl.NumberFormat(getIntlLocale(), {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat(getIntlLocale(), {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function formatTime(dateString: string): string {
  const date = new Date(dateString);
  const locale = getIntlLocale();
  return new Intl.DateTimeFormat(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: locale !== "da-DK",
  }).format(date);
}
