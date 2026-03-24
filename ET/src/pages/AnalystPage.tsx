import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { FileEdit, ArrowLeft, Check } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAuthStore } from "@/stores/auth";
import { toast } from "sonner";

export function AnalystPage() {
  const [onWaitlist, setOnWaitlist] = useState(false);
  const [loading, setLoading] = useState(false);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    if (!user?.id) return;
    supabase
      .from("analyst_waitlist")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) setOnWaitlist(true);
      });
  }, [user?.id]);

  async function joinWaitlist() {
    if (!user?.id || onWaitlist) return;
    setLoading(true);
    const { error } = await supabase.from("analyst_waitlist").insert({ user_id: user.id });

    if (!error) {
      setOnWaitlist(true);
      toast.success("You'll be the first to know!");
    }
    setLoading(false);
  }

  return (
    <div className="flex-1 overflow-y-auto bg-stone-50 dark:bg-black">
      <div className="max-w-2xl mx-auto p-8 md:p-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-stone-500 hover:text-stone-900 dark:hover:text-white mb-8 transition-colors"
        >
          <ArrowLeft className="size-4" />
          Back to dashboard
        </Link>

        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 rounded-xl bg-amber-100 dark:bg-amber-900/30">
            <FileEdit className="size-6 text-amber-600 dark:text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900 dark:text-white">Coming Soon — Analyst Mode</h1>
        </div>

        <p className="text-stone-600 dark:text-stone-400 mb-6 leading-relaxed">
          Analyst Mode will let you manually edit stories, add your own sources, annotate text, and create custom
          briefings for your team.
        </p>

        <ul className="space-y-3 mb-8">
          {[
            "Manual story editing and annotation",
            "Custom source integration",
            "Team briefing creation and sharing",
            "Custom report templates",
          ].map((feature) => (
            <li key={feature} className="flex items-center gap-3 text-sm text-stone-700 dark:text-stone-300">
              <span className="size-1.5 rounded-full bg-amber-500 shrink-0" />
              {feature}
            </li>
          ))}
        </ul>

        <button
          onClick={joinWaitlist}
          disabled={onWaitlist || loading}
          className={`inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg transition-colors ${
            onWaitlist
              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 cursor-default"
              : "bg-amber-500 hover:bg-amber-600 text-white"
          }`}
        >
          {onWaitlist ? (
            <>
              <Check className="size-4" />
              You're on the list!
            </>
          ) : (
            "Notify me when it's ready"
          )}
        </button>
      </div>
    </div>
  );
}
