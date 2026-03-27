import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useLocaleStore } from "@/stores/locale";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp, resetPassword } = useAuthStore();
  const t = useLocaleStore((s) => s.t);

  // Redirect if already logged in — use replace to prevent back-button login loop
  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    if (mode === "forgot") {
      const result = await resetPassword(email);
      if (result.error) {
        setError(result.error);
      } else {
        setSuccess(t.auth.resetEmailSent);
      }
      setLoading(false);
      return;
    }

    const result = mode === "login" ? await signIn(email, password) : await signUp(email, password, fullName);

    if (result.error) {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex">
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-stone-950 dark:bg-stone-900 text-white flex-col justify-between p-12">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Advanced Think Tank</h1>
          <p className="text-stone-400 mt-1">{t.nav.subtitle}</p>
        </div>
        <div className="space-y-6">
          <blockquote className="text-lg text-stone-300 leading-relaxed border-l-2 border-[var(--brand)] pl-4">
            "{t.auth.tagline}"
          </blockquote>
          <div className="flex items-center gap-6 text-sm text-stone-500">
            <span>{t.auth.activeSources.replace("{count}", "17")}</span>
            <span>{t.auth.dailyAnalyses}</span>
            <span>{t.auth.aiPowered}</span>
          </div>
        </div>
        <p className="text-xs text-stone-600">{t.common.copyright} &copy; 2026</p>
      </div>

      {/* Right panel - auth form */}
      <div className="flex-1 flex items-center justify-center p-8 relative">
        {/* Language switcher - top right */}
        <div className="absolute top-6 right-6">
          <LanguageSwitcher />
        </div>

        <div className="w-full max-w-sm">
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <Sparkles className="size-5 text-[var(--brand)]" />
            <h1 className="text-xl font-bold text-black dark:text-white">Advanced Think Tank</h1>
          </div>

          <h2 className="text-2xl font-bold text-black dark:text-white mb-1">
            {mode === "forgot" ? t.auth.forgotPassword : mode === "login" ? t.auth.logIn : t.auth.signUp}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">
            {mode === "forgot"
              ? t.auth.forgotSubtitle
              : mode === "login"
                ? t.auth.loginSubtitle
                : t.auth.signupSubtitle}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "signup" && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  {t.auth.fullName}
                </label>
                <input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-white rounded focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder={t.auth.fullNamePlaceholder}
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                {t.auth.email}
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-white rounded focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                placeholder={t.auth.emailPlaceholder}
                required
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  {t.auth.password}
                </label>
                <input
                  id="password"
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-white rounded focus:outline-none focus:border-black dark:focus:border-white transition-colors"
                  placeholder={t.auth.passwordPlaceholder}
                  required
                  minLength={8}
                />
              </div>
            )}

            {mode === "login" && (
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setMode("forgot");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="text-sm text-stone-500 hover:text-black dark:hover:text-white transition-colors"
                >
                  {t.auth.forgotPassword}
                </button>
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-[var(--brand)]">
                {error}
              </p>
            )}

            {success && (
              <p role="status" className="text-sm text-green-600 dark:text-green-400">
                {success}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <span>
                    {mode === "forgot" ? t.auth.sendResetLink : mode === "login" ? t.auth.logIn : t.auth.signUp}
                  </span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-stone-600 dark:text-stone-400">
            {mode === "forgot" ? (
              <button
                onClick={() => {
                  setMode("login");
                  setError(null);
                  setSuccess(null);
                }}
                className="font-medium text-black dark:text-white hover:underline"
              >
                {t.auth.backToLogin}
              </button>
            ) : (
              <>
                {mode === "login" ? t.auth.noAccount : t.auth.hasAccount}{" "}
                <button
                  onClick={() => {
                    setMode(mode === "login" ? "signup" : "login");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="font-medium text-black dark:text-white hover:underline"
                >
                  {mode === "login" ? t.auth.signUp : t.auth.logIn}
                </button>
              </>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}
