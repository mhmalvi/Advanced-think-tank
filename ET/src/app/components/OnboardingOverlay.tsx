import { useState } from "react";
import { useAuthStore } from "@/stores/auth";
import { useLocaleStore } from "@/stores/locale";
import { useSettingsStore } from "@/stores/settings";
import { supabase } from "@/lib/supabase";
import { useTheme } from "next-themes";
import { ArrowRight, ArrowLeft, Check, Sun, Moon, Monitor } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const INDUSTRIES = ["Economics", "Geopolitics", "Business", "Technology", "Energy", "Defense", "Trade", "Climate"];
const GEOGRAPHIES = ["Nordics", "EU", "USA", "China", "Middle East", "Global"];
const LENSES = ["Investor Lens", "CEO/Executive", "Policy & Regulation", "Supply Chain", "Danish Business Impact"];

type Step = 1 | 2 | 3 | 4;

function TagGrid({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: Set<string>;
  onToggle: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
      {options.map((opt) => {
        const isSelected = selected.has(opt);
        return (
          <button
            key={opt}
            onClick={() => onToggle(opt)}
            className={cn(
              "px-4 py-3 rounded-lg text-sm font-medium border-2 transition-all",
              isSelected
                ? "border-stone-900 dark:border-white bg-stone-900 dark:bg-white text-white dark:text-stone-900"
                : "border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 hover:border-stone-400 dark:hover:border-stone-500",
            )}
          >
            {isSelected && <Check className="inline size-3.5 mr-1.5 -mt-0.5" />}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  const options = [
    { value: "light", label: "Light", icon: Sun },
    { value: "dark", label: "Dark", icon: Moon },
    { value: "system", label: "System", icon: Monitor },
  ];

  return (
    <div className="flex gap-3">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setTheme(opt.value)}
          className={cn(
            "flex-1 flex flex-col items-center gap-2 px-4 py-5 rounded-lg border-2 transition-all",
            theme === opt.value
              ? "border-stone-900 dark:border-white bg-stone-50 dark:bg-stone-800"
              : "border-stone-200 dark:border-stone-700 hover:border-stone-400 dark:hover:border-stone-500",
          )}
        >
          <opt.icon className="size-6 text-stone-700 dark:text-stone-300" />
          <span className="text-sm font-medium text-stone-700 dark:text-stone-300">{opt.label}</span>
        </button>
      ))}
    </div>
  );
}

export function OnboardingOverlay() {
  const [step, setStep] = useState<Step>(1);
  const [industries, setIndustries] = useState<Set<string>>(new Set());
  const [geographies, setGeographies] = useState<Set<string>>(new Set());
  const [lenses, setLenses] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const user = useAuthStore((s) => s.user);
  const t = useLocaleStore((s) => s.t);
  const { theme } = useTheme();

  const toggle = (set: Set<string>, setFn: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) => {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setFn(next);
  };

  const canProceed =
    step === 1 ? industries.size > 0 : step === 2 ? geographies.size > 0 : step === 3 ? lenses.size > 0 : true;

  const handleSkip = () => {
    // Dismiss overlay without saving — needsOnboarding stays true
    // The banner on the dashboard will remind them
    useAuthStore.setState({ needsOnboarding: false });
  };

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);

    try {
      // Build preference rows
      const prefs: { user_id: string; preference_type: string; preference_value: string; source: string }[] = [];
      for (const v of industries)
        prefs.push({ user_id: user.id, preference_type: "industry", preference_value: v, source: "onboarding" });
      for (const v of geographies)
        prefs.push({ user_id: user.id, preference_type: "geography", preference_value: v, source: "onboarding" });
      for (const v of lenses)
        prefs.push({ user_id: user.id, preference_type: "lens", preference_value: v, source: "onboarding" });

      // Save preferences
      if (prefs.length > 0) {
        const { error: prefError } = await supabase.from("user_preferences").insert(prefs);
        if (prefError) throw prefError;
      }

      // Update profile
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          onboarding_completed: true,
          theme_preference: theme ?? "system",
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Sync to settings store
      const settingsStore = useSettingsStore.getState();
      for (const v of industries) settingsStore.addTopic(v);
      for (const v of geographies) settingsStore.addGeography(v);

      // Update auth store
      useAuthStore.setState({ needsOnboarding: false });

      toast.success("Setup complete! Your feed is now personalized.");
    } catch (e) {
      toast.error("Failed to save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    1: "What industries matter to you?",
    2: "What regions do you follow?",
    3: "Choose your analysis perspectives",
    4: "Theme & Display",
  };

  const stepDescriptions: Record<Step, string> = {
    1: "Select at least one industry to personalize your news feed.",
    2: "Select at least one region to focus your intelligence.",
    3: "Select at least one lens to shape how stories are analyzed.",
    4: "Choose your preferred appearance. You can change this anytime in settings.",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop — dashboard visible but blurred */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl mx-4 bg-white dark:bg-stone-950 rounded-2xl shadow-2xl border border-stone-200 dark:border-stone-800 overflow-hidden">
        {/* Progress bar */}
        <div className="flex h-1">
          {[1, 2, 3, 4].map((s) => (
            <div
              key={s}
              className={cn(
                "flex-1 transition-colors duration-300",
                s <= step ? "bg-stone-900 dark:bg-white" : "bg-stone-200 dark:bg-stone-800",
              )}
            />
          ))}
        </div>

        <div className="p-6 md:p-8">
          {/* Step indicator */}
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-medium text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              Step {step} of 4
            </span>
            <button
              onClick={handleSkip}
              className="text-xs text-stone-400 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
            >
              Skip for now
            </button>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-stone-900 dark:text-white mb-1">{stepTitles[step]}</h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">{stepDescriptions[step]}</p>

          {/* Step content */}
          {step === 1 && (
            <TagGrid
              options={INDUSTRIES}
              selected={industries}
              onToggle={(v) => toggle(industries, setIndustries, v)}
            />
          )}
          {step === 2 && (
            <TagGrid
              options={GEOGRAPHIES}
              selected={geographies}
              onToggle={(v) => toggle(geographies, setGeographies, v)}
            />
          )}
          {step === 3 && <TagGrid options={LENSES} selected={lenses} onToggle={(v) => toggle(lenses, setLenses, v)} />}
          {step === 4 && <ThemeSelector />}

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            {step > 1 ? (
              <button
                onClick={() => setStep((step - 1) as Step)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
              >
                <ArrowLeft className="size-4" />
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                onClick={() => setStep((step + 1) as Step)}
                disabled={!canProceed}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Next
                <ArrowRight className="size-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={saving}
                className="flex items-center gap-1.5 px-6 py-2.5 bg-stone-900 dark:bg-white text-white dark:text-stone-900 text-sm font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-200 disabled:opacity-50 transition-colors"
              >
                {saving ? "Saving..." : "Get Started"}
                {!saving && <ArrowRight className="size-4" />}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
