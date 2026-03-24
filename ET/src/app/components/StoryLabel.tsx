import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/app/components/ui/tooltip";
import type { StoryLabel as StoryLabelType } from "@/types/database";

const labelColors: Record<StoryLabelType["type"], string> = {
  source: "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300",
  ai: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
  editorial: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  personal: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
};

const labelTypeNames: Record<StoryLabelType["type"], string> = {
  source: "Source",
  ai: "AI Analysis",
  editorial: "ET Editorial",
  personal: "Your Preferences",
};

export function LabelPill({ label }: { label: StoryLabelType }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium leading-tight cursor-default select-none",
              labelColors[label.type],
            )}
          >
            {label.text}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs text-xs">
          <p className="font-medium mb-0.5">{labelTypeNames[label.type]}</p>
          <p className="text-muted-foreground">{label.reason}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function StoryLabels({
  labels,
  max = 4,
  userPreferences,
}: {
  labels: StoryLabelType[];
  max?: number;
  userPreferences?: string[];
}) {
  // Compute personal labels at render time
  const allLabels = [...labels];
  if (userPreferences && userPreferences.length > 0) {
    const existingTexts = new Set(labels.map((l) => l.text.toLowerCase()));
    for (const pref of userPreferences) {
      const matchesLabel = labels.some(
        (l) => (l.type === "ai" || l.type === "editorial") && l.text.toLowerCase().includes(pref.toLowerCase()),
      );
      if (matchesLabel && !existingTexts.has(pref.toLowerCase())) {
        allLabels.push({
          type: "personal",
          text: pref,
          reason: `Matches your interest in '${pref}'`,
        });
      }
    }
  }

  const visible = allLabels.slice(0, max);
  const overflow = allLabels.length - max;

  return (
    <div className="flex flex-wrap gap-1">
      {visible.map((l, i) => (
        <LabelPill key={`${l.type}-${l.text}-${i}`} label={l} />
      ))}
      {overflow > 0 && (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400 cursor-default">
          +{overflow} more
        </span>
      )}
    </div>
  );
}
