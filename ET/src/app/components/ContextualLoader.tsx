import { useState, useEffect } from "react";
import { useLocaleStore } from "@/stores/locale";
import { cn } from "@/lib/utils";

type LoadingContext = "synthesizing" | "searching" | "analyzing" | "exporting" | "loading";

interface ContextualLoaderProps {
  context: LoadingContext;
  className?: string;
}

const messages: Record<LoadingContext, string[]> = {
  synthesizing: [
    "Fetching all sources...",
    "Synthesising the news...",
    "Applying ET secret sauce...",
    "Cross-referencing timelines...",
  ],
  searching: [
    "Going to China and taking Marco Polo's route back with your news...",
    "Strait of Hormuz creating news-related bottlenecks, going around the Horn of Africa...",
    "Scanning global wires...",
  ],
  analyzing: [
    "Running impact analysis across 3 continents...",
    "Checking if Denmark should worry...",
    "Connecting the dots between Washington and Copenhagen...",
  ],
  exporting: ["Formatting your briefing...", "Making it look official...", "Ready for the boardroom..."],
  loading: ["Preparing your briefing...", "Warming up the canvas...", "Almost ready..."],
};

const messagesDa: Record<LoadingContext, string[]> = {
  synthesizing: [
    "Henter alle kilder...",
    "Syntetiserer nyhederne...",
    "Tilfojer ET's hemmelige ingrediens...",
    "Krydsrefererer tidslinjer...",
  ],
  searching: [
    "Paa vej til Kina via Marco Polos rute med dine nyheder...",
    "Hormuzstraedet skaber nyhedsflaskehalse, tager ruten rundt om Afrikas Horn...",
    "Scanner globale nyhedstjenester...",
  ],
  analyzing: [
    "Koerer konsekvensanalyse paa tvaers af 3 kontinenter...",
    "Tjekker om Danmark bor bekymre sig...",
    "Forbinder prikkerne mellem Washington og Koebenhavn...",
  ],
  exporting: ["Formaterer din briefing...", "Goer det officielt...", "Klar til bestyrelseslokalet..."],
  loading: ["Forbereder din briefing...", "Varmer canvasset op...", "Naesten klar..."],
};

export function ContextualLoader({ context, className }: ContextualLoaderProps) {
  const [index, setIndex] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const locale = useLocaleStore((s) => s.locale);

  const pool = locale === "da" ? messagesDa[context] : messages[context];

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % pool.length);
        setFadeIn(true);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, [pool.length]);

  return (
    <div className={cn("flex flex-col items-center gap-3", className)}>
      {/* Progress bar */}
      <div className="w-full max-w-xs h-1 bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
        <div className="h-full bg-[#E30613] rounded-full animate-[indeterminate_1.5s_ease-in-out_infinite]" />
      </div>
      <p
        className={cn(
          "text-sm text-stone-500 dark:text-stone-400 text-center transition-opacity duration-300",
          fadeIn ? "opacity-100" : "opacity-0",
        )}
      >
        {pool[index]}
      </p>
      <style>{`
        @keyframes indeterminate {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
