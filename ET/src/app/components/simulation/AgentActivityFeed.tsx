/**
 * AgentActivityFeed — MiroFish-style feed showing individual agent reactions.
 *
 * Displays a scrollable timeline of agent interactions with archetype badges,
 * sentiment indicators, action icons, and comment text.
 */

import { useState } from "react";
import {
  ThumbsUp,
  ThumbsDown,
  Share2,
  MessageSquare,
  EyeOff,
  ChevronDown,
  ChevronUp,
  Users,
  Filter,
} from "lucide-react";
import type { AgentAction } from "@/types/simulation";

interface AgentActivityFeedProps {
  actions: AgentAction[];
  onClose: () => void;
}

const ARCHETYPE_COLORS: Record<string, string> = {
  Analyst: "bg-blue-500",
  Investor: "bg-emerald-500",
  Journalist: "bg-amber-500",
  PolicyMaker: "bg-purple-500",
  Academic: "bg-cyan-500",
  Public: "bg-rose-500",
};

const ARCHETYPE_LABELS: Record<string, string> = {
  Analyst: "AN",
  Investor: "IN",
  Journalist: "JR",
  PolicyMaker: "PM",
  Academic: "AC",
  Public: "PB",
};

const ACTION_ICONS: Record<string, typeof ThumbsUp> = {
  like: ThumbsUp,
  dislike: ThumbsDown,
  share: Share2,
  comment: MessageSquare,
  ignore: EyeOff,
};

const ACTION_COLORS: Record<string, string> = {
  like: "text-green-500",
  dislike: "text-red-400",
  share: "text-blue-500",
  comment: "text-amber-500",
  ignore: "text-stone-400",
};

function sentimentColor(s: number): string {
  if (s > 0.3) return "bg-green-500";
  if (s > 0) return "bg-green-300";
  if (s > -0.3) return "bg-amber-400";
  return "bg-red-500";
}

function sentimentLabel(s: number): string {
  if (s > 0.5) return "very positive";
  if (s > 0.2) return "positive";
  if (s > -0.2) return "neutral";
  if (s > -0.5) return "negative";
  return "very negative";
}

export function AgentActivityFeed({ actions, onClose }: AgentActivityFeedProps) {
  const [filterArchetype, setFilterArchetype] = useState<string | null>(null);
  const [filterAction, setFilterAction] = useState<string | null>(null);
  const [filterStep, setFilterStep] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(true);

  const archetypes = [...new Set(actions.map((a) => a.archetype))].sort();
  const steps = [...new Set(actions.map((a) => a.step))].sort();

  const filtered = actions.filter((a) => {
    if (filterArchetype && a.archetype !== filterArchetype) return false;
    if (filterAction && a.action !== filterAction) return false;
    if (filterStep !== null && a.step !== filterStep) return false;
    return true;
  });

  // Group by step for timeline view
  const byStep = new Map<number, AgentAction[]>();
  for (const a of filtered) {
    const list = byStep.get(a.step) || [];
    list.push(a);
    byStep.set(a.step, list);
  }

  // Summary stats
  const stats = {
    total: actions.length,
    likes: actions.filter((a) => a.action === "like").length,
    shares: actions.filter((a) => a.action === "share").length,
    comments: actions.filter((a) => a.action === "comment").length,
    avgSentiment: actions.length
      ? actions.reduce((s, a) => s + a.sentiment, 0) / actions.length
      : 0,
  };

  return (
    <div className="flex flex-col h-full border-l border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-950">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-800 shrink-0">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-[#E30613]" />
          <span className="text-xs font-bold text-stone-900 dark:text-white">
            Agent Activity
          </span>
          <span className="text-[10px] text-stone-400 font-mono">
            {stats.total} actions
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-[10px] text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
        >
          Close
        </button>
      </div>

      {/* Summary bar */}
      <div className="flex items-center gap-3 px-4 py-2 border-b border-stone-100 dark:border-stone-800/50 text-[10px] text-stone-500 shrink-0">
        <span className="flex items-center gap-1">
          <ThumbsUp className="size-3 text-green-500" /> {stats.likes}
        </span>
        <span className="flex items-center gap-1">
          <Share2 className="size-3 text-blue-500" /> {stats.shares}
        </span>
        <span className="flex items-center gap-1">
          <MessageSquare className="size-3 text-amber-500" /> {stats.comments}
        </span>
        <span className="flex items-center gap-1">
          <span className={`size-2 rounded-full ${sentimentColor(stats.avgSentiment)}`} />
          {sentimentLabel(stats.avgSentiment)}
        </span>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-stone-100 dark:border-stone-800/50 shrink-0 overflow-x-auto">
        <Filter className="size-3 text-stone-400 shrink-0" />
        {/* Archetype filter */}
        {archetypes.map((arch) => (
          <button
            key={arch}
            onClick={() =>
              setFilterArchetype(filterArchetype === arch ? null : arch)
            }
            className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-colors ${
              filterArchetype === arch
                ? `${ARCHETYPE_COLORS[arch]} text-white`
                : "bg-stone-100 dark:bg-stone-800 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300"
            }`}
          >
            {arch}
          </button>
        ))}
        <span className="text-stone-300 dark:text-stone-700">|</span>
        {/* Step filter */}
        {steps.map((step) => (
          <button
            key={step}
            onClick={() => setFilterStep(filterStep === step ? null : step)}
            className={`px-2 py-0.5 rounded text-[10px] font-mono transition-colors ${
              filterStep === step
                ? "bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900"
                : "bg-stone-100 dark:bg-stone-800 text-stone-500"
            }`}
          >
            Wave {step + 1}
          </button>
        ))}
      </div>

      {/* Activity feed */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {[...byStep.entries()]
          .sort(([a], [b]) => a - b)
          .map(([step, stepActions]) => (
            <div key={step} className="mb-4">
              {/* Step header */}
              <div className="flex items-center gap-2 mb-2">
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
                <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                  Wave {step + 1}
                </span>
                <span className="text-[10px] text-stone-300">
                  {stepActions.length} reactions
                </span>
                <div className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
              </div>

              {/* Actions */}
              <div className="space-y-1.5">
                {stepActions.map((action, i) => {
                  const Icon = ACTION_ICONS[action.action] || EyeOff;
                  return (
                    <div
                      key={`${action.agent_id}-${step}-${i}`}
                      className="flex items-start gap-2 px-2 py-1.5 rounded-md hover:bg-stone-50 dark:hover:bg-stone-900/50 transition-colors group"
                    >
                      {/* Avatar */}
                      <div
                        className={`size-6 rounded-full ${ARCHETYPE_COLORS[action.archetype] || "bg-stone-400"} flex items-center justify-center text-[9px] font-bold text-white shrink-0 mt-0.5`}
                      >
                        {ARCHETYPE_LABELS[action.archetype] || "??"}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-medium text-stone-800 dark:text-stone-200">
                            {action.agent_id.replace(/_/g, " ")}
                          </span>
                          <Icon
                            className={`size-3 ${ACTION_COLORS[action.action]}`}
                          />
                          <span className="text-[10px] text-stone-400">
                            {action.action}
                          </span>
                          {/* Sentiment dot */}
                          <span
                            className={`size-1.5 rounded-full ${sentimentColor(action.sentiment)}`}
                            title={`Sentiment: ${action.sentiment.toFixed(2)}`}
                          />
                          {/* Engagement depth bar */}
                          <div className="w-8 h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-stone-500 rounded-full"
                              style={{
                                width: `${action.engagement_depth * 100}%`,
                              }}
                            />
                          </div>
                        </div>

                        {/* Comment text or reasoning */}
                        {(action.comment_text || action.reasoning) && (
                          <p className="text-[10px] text-stone-400 mt-0.5 line-clamp-2 group-hover:line-clamp-none transition-all">
                            {action.comment_text || action.reasoning}
                          </p>
                        )}
                      </div>

                      {/* Share badge */}
                      {action.would_share && action.action !== "share" && (
                        <span className="text-[9px] text-blue-400 bg-blue-50 dark:bg-blue-950 px-1 rounded shrink-0">
                          +share
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-stone-400">
            <Users className="size-8 mb-2 opacity-30" />
            <p className="text-xs">No agent actions to display</p>
            <p className="text-[10px] mt-1">
              Run a simulation to see agent activity
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
