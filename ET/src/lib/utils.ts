import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Parses a date string, handling various formats from web search APIs
 * (ISO 8601, "YYYY-MM-DD", "Mon DD, YYYY", "DD Mon YYYY", Unix timestamps, etc.)
 */
function parseDate(value: string): Date | null {
  if (!value) return null;
  // Try native parsing first (handles ISO 8601, most standard formats)
  let date = new Date(value);
  if (!isNaN(date.getTime())) return date;

  // Try "YYYYMMDD" (compact format from some APIs)
  if (/^\d{8}$/.test(value)) {
    date = new Date(`${value.slice(0, 4)}-${value.slice(4, 6)}-${value.slice(6, 8)}`);
    if (!isNaN(date.getTime())) return date;
  }

  // Try Unix timestamp (seconds)
  if (/^\d{10}$/.test(value)) {
    date = new Date(Number(value) * 1000);
    if (!isNaN(date.getTime())) return date;
  }

  // Try Unix timestamp (milliseconds)
  if (/^\d{13}$/.test(value)) {
    date = new Date(Number(value));
    if (!isNaN(date.getTime())) return date;
  }

  // Try "X hours/days ago" relative formats
  const relMatch = value.match(/^(\d+)\s*(hour|hr|minute|min|day|second|sec|week|month)s?\s*ago$/i);
  if (relMatch?.[1] && relMatch[2]) {
    const n = Number(relMatch[1]);
    const unit = relMatch[2].toLowerCase();
    const now = Date.now();
    const ms: Record<string, number> = {
      second: 1000,
      sec: 1000,
      minute: 60000,
      min: 60000,
      hour: 3600000,
      hr: 3600000,
      day: 86400000,
      week: 604800000,
      month: 2592000000,
    };
    const multiplier = ms[unit];
    if (multiplier) return new Date(now - n * multiplier);
  }

  return null;
}

export function safeFormatDate(value: string | null | undefined, fallback: string = "\u2014"): string {
  if (!value) return fallback;
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString();
}

export function safeFormatDateTime(value: string | null | undefined, fallback: string = "\u2014"): string {
  if (!value) return fallback;
  const date = parseDate(value);
  if (!date) return fallback;
  return date.toLocaleString();
}

/** Formats a publication date consistently: "18 Mar 2026". Uses locale-aware formatting. */
export function formatPublicationDate(value: string | null | undefined, locale: string = "en"): string {
  if (!value) return "\u2014";
  const date = parseDate(value);
  if (!date) return "\u2014";
  return date.toLocaleDateString(locale === "da" ? "da-DK" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Returns a relative time string like "2h ago" or a short date for older items. */
export function relativeTime(value: string | null | undefined): string {
  if (!value) return "\u2014";
  const date = parseDate(value);
  if (!date) return "\u2014";
  const diff = Date.now() - date.getTime();
  if (diff < 0) return date.toLocaleDateString();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString();
}
