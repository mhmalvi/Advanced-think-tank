import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useLocaleStore } from "@/stores/locale";
import { ArrowRight, Loader2, CheckCircle2 } from "lucide-react";

export function PasswordResetPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user, updatePassword } = useAuthStore();
  const t = useLocaleStore((s) => s.t);

  // If user is not authenticated via the reset link, Supabase will have set the session
  // from the URL token automatically. If no user, redirect to auth.
  if (!user && !loading) {
    return <Navigate to="/auth" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError(t.auth.passwordsDoNotMatch);
      return;
    }

    if (password.length < 8) {
      setError(t.auth.passwordTooShort);
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (success) {
    return (
      <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center p-8">
        <div className="w-full max-w-sm text-center">
          <CheckCircle2 className="size-12 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-black dark:text-white mb-2">{t.auth.passwordUpdated}</h2>
          <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{t.auth.passwordUpdatedDesc}</p>
          <Link
            to="/dashboard"
            replace
            className="inline-flex items-center gap-2 px-6 py-3 bg-black dark:bg-white text-white dark:text-black font-medium rounded hover:bg-stone-800 dark:hover:bg-stone-200 transition-colors"
          >
            {t.auth.goToDashboard}
            <ArrowRight className="size-4" />
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex items-center justify-center p-8">
      <div className="w-full max-w-sm">
        <h2 className="text-2xl font-bold text-black dark:text-white mb-1">{t.auth.resetPassword}</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400 mb-6">{t.auth.resetPasswordDesc}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              {t.auth.newPassword}
            </label>
            <input
              id="newPassword"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-white rounded focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              placeholder={t.auth.passwordPlaceholder}
              required
              minLength={8}
            />
          </div>

          <div>
            <label
              htmlFor="confirmPassword"
              className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1"
            >
              {t.auth.confirmPassword}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 text-black dark:text-white rounded focus:outline-none focus:border-black dark:focus:border-white transition-colors"
              placeholder={t.auth.confirmPasswordPlaceholder}
              required
              minLength={8}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-[var(--brand)]">
              {error}
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
                <span>{t.auth.updatePasswordBtn}</span>
                <ArrowRight className="size-4" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
