import { useState, useMemo, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
} from "recharts";
import { ChevronDown, ChevronRight, Quote } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Pre-process custom tags before Markdown rendering ───

type ParsedBlock =
  | { type: "markdown"; content: string }
  | { type: "background"; content: string }
  | { type: "pull_quote"; source: string; author: string; date: string; text: string }
  | { type: "chart_data"; chartType: "donut" | "bar" | "line"; data: Record<string, unknown>[]; title: string }
  | { type: "stat_callout"; value: string; label: string; source: string };

function parseStoryContent(raw: string): ParsedBlock[] {
  const blocks: ParsedBlock[] = [];
  let remaining = raw;

  while (remaining.length > 0) {
    // Find the earliest custom tag
    const bgStart = remaining.indexOf("[BACKGROUND]");
    const pqStart = remaining.indexOf("<pull_quote");
    const cdStart = remaining.indexOf("<chart_data");
    const scStart = remaining.indexOf("<stat_callout");

    const positions = [
      bgStart >= 0 ? bgStart : Infinity,
      pqStart >= 0 ? pqStart : Infinity,
      cdStart >= 0 ? cdStart : Infinity,
      scStart >= 0 ? scStart : Infinity,
    ];
    const earliest = Math.min(...positions);

    if (earliest === Infinity) {
      // No more custom tags
      if (remaining.trim()) blocks.push({ type: "markdown", content: remaining });
      break;
    }

    // Push markdown before the tag
    const before = remaining.slice(0, earliest);
    if (before.trim()) blocks.push({ type: "markdown", content: before });

    if (earliest === bgStart) {
      const end = remaining.indexOf("[/BACKGROUND]", bgStart);
      if (end >= 0) {
        const inner = remaining.slice(bgStart + "[BACKGROUND]".length, end).trim();
        blocks.push({ type: "background", content: inner });
        remaining = remaining.slice(end + "[/BACKGROUND]".length);
      } else {
        remaining = remaining.slice(bgStart + "[BACKGROUND]".length);
      }
    } else if (earliest === pqStart) {
      const match = remaining
        .slice(pqStart)
        .match(/<pull_quote\s+source="([^"]*)"\s+author="([^"]*)"\s+date="([^"]*)">([\s\S]*?)<\/pull_quote>/);
      if (match) {
        blocks.push({ type: "pull_quote", source: match[1], author: match[2], date: match[3], text: match[4].trim() });
        remaining = remaining.slice(pqStart + match[0].length);
      } else {
        remaining = remaining.slice(pqStart + 1);
      }
    } else if (earliest === cdStart) {
      const match = remaining
        .slice(cdStart)
        .match(/<chart_data\s+type="([^"]*)"\s+data='([^']*)'\s+title="([^"]*)"[^/]*\/>/);
      if (match) {
        try {
          const data = JSON.parse(match[2]) as Record<string, unknown>[];
          blocks.push({ type: "chart_data", chartType: match[1] as "donut" | "bar" | "line", data, title: match[3] });
        } catch {
          /* skip malformed */
        }
        remaining = remaining.slice(cdStart + match[0].length);
      } else {
        remaining = remaining.slice(cdStart + 1);
      }
    } else if (earliest === scStart) {
      const match = remaining
        .slice(scStart)
        .match(/<stat_callout\s+value="([^"]*)"\s+label="([^"]*)"\s+source="([^"]*)"[^/]*\/>/);
      if (match) {
        blocks.push({ type: "stat_callout", value: match[1], label: match[2], source: match[3] });
        remaining = remaining.slice(scStart + match[0].length);
      } else {
        remaining = remaining.slice(scStart + 1);
      }
    }
  }

  return blocks;
}

// ─── Custom Markdown components ───

function MarkdownBlock({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="text-xl font-bold mt-8 mb-3 text-stone-900 dark:text-white border-l-2 border-red-500 pl-3">
            {children}
          </h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-lg font-semibold mt-5 mb-2 text-stone-800 dark:text-stone-100">{children}</h3>
        ),
        p: ({ children }) => <p className="text-stone-700 dark:text-stone-300 mb-3 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-stone-900 dark:text-white">{children}</strong>,
        em: ({ children }) => <em className="italic text-stone-600 dark:text-stone-400">{children}</em>,
        ul: ({ children }) => (
          <ul className="list-disc ml-5 mb-3 space-y-1 text-stone-700 dark:text-stone-300">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal ml-5 mb-3 space-y-1 text-stone-700 dark:text-stone-300">{children}</ol>
        ),
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-stone-300 dark:border-stone-600 pl-4 my-3 text-stone-600 dark:text-stone-400 italic">
            {children}
          </blockquote>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-blue-400 underline underline-offset-2 hover:text-blue-800 dark:hover:text-blue-300"
          >
            {children}
          </a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

// ─── Background Section ───

function BackgroundSection({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="my-4 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/60 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-2 px-4 py-2.5 text-xs font-semibold text-stone-500 dark:text-stone-300 uppercase tracking-wider hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
      >
        {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
        Background Context
      </button>
      {expanded && (
        <div className="px-4 pb-4 text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
          <MarkdownBlock content={content} />
        </div>
      )}
    </div>
  );
}

// ─── Pull Quote ───

function PullQuoteBlock({
  source,
  author,
  date,
  text,
}: {
  source: string;
  author: string;
  date: string;
  text: string;
}) {
  return (
    <figure className="my-6 px-6 py-5 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
      <div className="flex gap-3">
        <Quote className="size-6 text-stone-300 dark:text-stone-600 shrink-0 mt-0.5" />
        <blockquote className="text-base italic text-stone-700 dark:text-stone-300 leading-relaxed">{text}</blockquote>
      </div>
      <figcaption className="mt-3 ml-9 text-xs text-stone-500 dark:text-stone-400">
        <span className="font-medium text-stone-700 dark:text-stone-300">{author}</span>
        {source && <span> — {source}</span>}
        {date && <span> ({date})</span>}
      </figcaption>
    </figure>
  );
}

// ─── Chart ───

const CHART_COLORS = ["#ef4444", "#3b82f6", "#f59e0b", "#10b981", "#8b5cf6", "#ec4899"];

function ChartBlock({ chartType, data, title }: { chartType: string; data: Record<string, unknown>[]; title: string }) {
  // Detect key names from data
  const keys = data.length > 0 ? Object.keys(data[0]) : [];
  const labelKey = keys.find((k) => typeof data[0][k] === "string") ?? keys[0] ?? "label";
  const valueKey = keys.find((k) => typeof data[0][k] === "number") ?? keys[1] ?? "value";

  return (
    <div className="my-6 p-4 rounded-lg border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900/50">
      <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <ResponsiveContainer width="100%" height={200}>
        {chartType === "bar" ? (
          <BarChart data={data}>
            <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip />
            <Bar dataKey={valueKey} fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        ) : chartType === "line" ? (
          <LineChart data={data}>
            <XAxis dataKey={labelKey} tick={{ fontSize: 11 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <RechartsTooltip />
            <Line type="monotone" dataKey={valueKey} stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : (
          <PieChart>
            <Pie
              data={data}
              dataKey={valueKey}
              nameKey={labelKey}
              cx="50%"
              cy="50%"
              outerRadius={70}
              label={({ name }) => name}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
              ))}
            </Pie>
            <RechartsTooltip />
          </PieChart>
        )}
      </ResponsiveContainer>
    </div>
  );
}

// ─── Stat Callout ───

function StatCalloutBlock({ value, label, source }: { value: string; label: string; source: string }) {
  return (
    <div className="my-5 flex items-baseline gap-3 px-5 py-4 rounded-lg border border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/40">
      <span className="text-3xl font-black text-stone-900 dark:text-white tracking-tight">{value}</span>
      <div>
        <span className="text-sm text-stone-600 dark:text-stone-400">{label}</span>
        {source && (
          <span className="block text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">Source: {source}</span>
        )}
      </div>
    </div>
  );
}

// ─── Main Renderer ───

export function StoryRenderer({ content }: { content: string }) {
  const blocks = useMemo(() => parseStoryContent(content), [content]);

  return (
    <article className="max-w-none">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "markdown":
            return <MarkdownBlock key={i} content={block.content} />;
          case "background":
            return <BackgroundSection key={i} content={block.content} />;
          case "pull_quote":
            return <PullQuoteBlock key={i} {...block} />;
          case "chart_data":
            return <ChartBlock key={i} {...block} />;
          case "stat_callout":
            return <StatCalloutBlock key={i} {...block} />;
          default:
            return null;
        }
      })}
    </article>
  );
}
