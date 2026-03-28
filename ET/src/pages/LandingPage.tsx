import { Link } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { useLocaleStore } from "@/stores/locale";
import { LanguageSwitcher } from "@/app/components/LanguageSwitcher";
import { ThemeToggle } from "@/app/components/ThemeToggle";
import { ImageWithFallback } from "@/app/components/figma/ImageWithFallback";
import {
  Newspaper,
  Brain,
  Search,
  Zap,
  Globe,
  ArrowRight,
  BarChart3,
  Shield,
  Layers,
  Sparkles,
  Database,
  ChevronDown,
  FlaskConical,
} from "lucide-react";

export function LandingPage() {
  const user = useAuthStore((s) => s.user);
  const t = useLocaleStore((s) => s.t);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ─── NAV ─── */}
      <header className="sticky top-0 z-50 border-b border-stone-200 dark:border-stone-800 bg-background/80 backdrop-blur-sm">
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 h-14">
          <Link to="/" className="flex items-center gap-3">
            <ImageWithFallback
              src="/logo.svg"
              alt={t.common.logoAlt}
              className="h-8 w-auto object-contain dark:invert"
            />
            <span className="hidden sm:inline text-[10px] uppercase tracking-[0.2em] text-muted-foreground border-l border-stone-300 dark:border-stone-700 pl-3 ml-0.5">
              {t.landing.heroSubtitle}
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageSwitcher />
            {user ? (
              <Link
                to="/dashboard"
                className="flex items-center gap-1.5 rounded bg-[var(--brand)] px-4 py-1.5 text-sm font-medium text-white hover:bg-[var(--brand-hover)] transition-colors"
              >
                {t.landing.goToDashboard}
                <ArrowRight className="size-3.5" />
              </Link>
            ) : (
              <>
                <Link
                  to="/auth"
                  className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5"
                >
                  {t.landing.logIn}
                </Link>
                <Link
                  to="/auth?signup"
                  className="flex items-center gap-1.5 rounded bg-foreground px-4 py-1.5 text-sm font-medium text-background hover:opacity-90 transition-opacity"
                >
                  {t.landing.getStarted}
                  <ArrowRight className="size-3.5" />
                </Link>
              </>
            )}
          </div>
        </nav>
      </header>

      <main>
        {/* ─── HERO ─── */}
        <section className="relative overflow-hidden">
          {/* Subtle grid background */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,var(--border)_1px,transparent_1px),linear-gradient(to_bottom,var(--border)_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />

          <div className="relative mx-auto max-w-6xl px-6 pt-20 pb-16 sm:pt-28 sm:pb-20">
            <div className="mx-auto max-w-3xl text-center">
              {/* Status badge */}
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-stone-200 dark:border-stone-800 bg-background px-4 py-1.5 text-xs text-muted-foreground">
                <span className="relative flex size-2">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-[#E30613] opacity-75" />
                  <span className="relative inline-flex size-2 rounded-full bg-[#E30613]" />
                </span>
                {t.landing.sourcesSubtitle}
              </div>

              <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight leading-[1.05]">
                {t.landing.heroTitle}
              </h1>
              <p className="mt-3 text-lg sm:text-xl font-medium text-[var(--brand)]">{t.landing.heroSubtitle}</p>
              <p className="mx-auto mt-6 max-w-xl text-base sm:text-lg text-muted-foreground leading-relaxed">
                {t.landing.heroTaglineShort}
              </p>

              {/* CTA buttons */}
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                {user ? (
                  <Link
                    to="/dashboard"
                    className="flex items-center gap-2 rounded bg-foreground px-8 py-3 text-sm font-medium text-background hover:opacity-90 transition-opacity"
                  >
                    {t.landing.goToDashboard}
                    <ArrowRight className="size-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/auth?signup"
                      className="flex items-center gap-2 rounded bg-foreground px-8 py-3 text-sm font-medium text-background hover:opacity-90 transition-opacity"
                    >
                      {t.landing.getStarted}
                      <ArrowRight className="size-4" />
                    </Link>
                    <Link
                      to="/auth"
                      className="flex items-center gap-2 rounded border-2 border-stone-300 dark:border-stone-700 px-8 py-3 text-sm font-medium text-foreground hover:bg-accent transition-colors"
                    >
                      {t.landing.logIn}
                    </Link>
                  </>
                )}
              </div>
            </div>

            {/* Scroll hint */}
            <div className="mt-14 flex justify-center">
              <ChevronDown className="size-5 text-muted-foreground animate-bounce" />
            </div>
          </div>
        </section>

        {/* ─── METRICS + DEMO ─── */}
        <section className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/30">
          <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
            {/* Metrics row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
              <MetricCard
                icon={<Database className="size-4" />}
                value="17+"
                label={t.landing.statSources}
                detail="RSS / API"
              />
              <MetricCard
                icon={<Zap className="size-4" />}
                value={t.landing.statUpdatesValue}
                label={t.landing.statUpdates}
                detail="Automated"
              />
              <MetricCard
                icon={<Brain className="size-4" />}
                value={t.landing.statAnalysisValue}
                label={t.landing.statAnalysis}
                detail="RAG + Synthesis"
              />
              <MetricCard
                icon={<Globe className="size-4" />}
                value={t.landing.statCoverageValue}
                label={t.landing.statCoverage}
                detail="Global"
              />
            </div>

            {/* Dashboard preview */}
            <div className="rounded-lg border-2 border-stone-200 dark:border-stone-800 bg-background overflow-hidden shadow-sm">
              {/* Toolbar */}
              <div className="flex items-center gap-2 px-4 py-2.5 border-b border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/50">
                <div className="flex gap-1.5">
                  <span className="size-2.5 rounded-full bg-red-400/80" />
                  <span className="size-2.5 rounded-full bg-amber-400/80" />
                  <span className="size-2.5 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 mx-6">
                  <div className="mx-auto max-w-xs h-6 rounded-md bg-background border border-stone-200 dark:border-stone-700 flex items-center px-3">
                    <span className="text-[10px] text-muted-foreground font-mono">app.advancedthinktank.com</span>
                  </div>
                </div>
              </div>
              {/* Two-pane layout mimicking real dashboard */}
              <div className="flex">
                {/* Fake left nav */}
                <div className="hidden sm:block w-48 border-r border-stone-200 dark:border-stone-800 p-4 bg-background">
                  <div className="h-4 w-20 rounded bg-stone-200 dark:bg-stone-700 mb-4" />
                  <div className="space-y-2">
                    {[0.8, 0.65, 0.9, 0.55, 0.7].map((w, i) => (
                      <div
                        key={i}
                        className="h-3 rounded bg-stone-100 dark:bg-stone-800"
                        style={{ width: `${w * 100}%` }}
                      />
                    ))}
                  </div>
                  <div className="mt-6 h-3 w-16 rounded bg-stone-200 dark:bg-stone-700 mb-3" />
                  <div className="space-y-2">
                    {[0.6, 0.75, 0.5].map((w, i) => (
                      <div
                        key={i}
                        className="h-3 rounded bg-stone-100 dark:bg-stone-800"
                        style={{ width: `${w * 100}%` }}
                      />
                    ))}
                  </div>
                </div>
                {/* Main content */}
                <div className="flex-1 min-w-0">
                  {/* Query bar */}
                  <div className="p-4 sm:p-5 border-b border-stone-200 dark:border-stone-800">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-stone-400" />
                      <div className="w-full pl-10 pr-14 py-2.5 text-sm border-2 border-stone-300 dark:border-stone-700 bg-background rounded flex items-center">
                        <span className="text-muted-foreground text-xs sm:text-sm truncate">
                          {t.landing.queryExample}
                        </span>
                      </div>
                      <div className="absolute right-2 top-1/2 -translate-y-1/2">
                        <div className="p-1.5 bg-[var(--brand)] rounded">
                          <Sparkles className="size-3.5 text-white" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Analysis result */}
                  <div className="p-4 sm:p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="size-4 text-[var(--brand)]" />
                        <span className="text-sm font-medium">{t.answer.analysis}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded-full px-2 py-0.5">
                          {t.answer.confidence} 87%
                        </span>
                        <span className="text-[10px] text-muted-foreground">4 {t.answer.sourcesLabel}</span>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      <div className="h-2.5 rounded-sm bg-stone-100 dark:bg-stone-800 w-full" />
                      <div className="h-2.5 rounded-sm bg-stone-100 dark:bg-stone-800 w-[94%]" />
                      <div className="h-2.5 rounded-sm bg-stone-100 dark:bg-stone-800 w-[88%]" />
                      <div className="h-2.5 rounded-sm bg-stone-100 dark:bg-stone-800 w-[72%]" />
                      <div className="h-2.5 rounded-sm bg-stone-100 dark:bg-stone-800 w-[82%]" />
                    </div>
                    {/* Citation chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {[
                        { name: "Reuters", score: "94%" },
                        { name: "Financial Times", score: "91%" },
                        { name: "BBC", score: "87%" },
                        { name: "Bloomberg", score: "83%" },
                      ].map((s) => (
                        <span
                          key={s.name}
                          className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2.5 py-1 rounded-full border border-stone-200 dark:border-stone-700 text-muted-foreground bg-stone-50 dark:bg-stone-800/50"
                        >
                          <span className="size-1.5 rounded-full bg-[var(--brand)]" />
                          {s.name}
                          <span className="text-stone-400 dark:text-stone-500">{s.score}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── FEATURES ─── */}
        <section className="border-t border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.landing.featuresTitle}</h2>
              <p className="mt-3 text-muted-foreground max-w-lg mx-auto">{t.landing.featuresSubtitle}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FeatureCard
                icon={<Newspaper className="size-5" />}
                title={t.landing.featureSourcesTitle}
                description={t.landing.featureSourcesDesc}
                accent={false}
              />
              <FeatureCard
                icon={<Brain className="size-5" />}
                title={t.landing.featureAiTitle}
                description={t.landing.featureAiDesc}
                accent
              />
              <FeatureCard
                icon={<Shield className="size-5" />}
                title={t.landing.featureCitationsTitle}
                description={t.landing.featureCitationsDesc}
                accent
              />
              <FeatureCard
                icon={<Layers className="size-5" />}
                title={t.landing.featureLensesTitle}
                description={t.landing.featureLensesDesc}
                accent={false}
              />
              <FeatureCard
                icon={<FlaskConical className="size-5" />}
                title="Predictive Intelligence"
                description="50 AI agents simulate how stories spread — predicting engagement, polarization, and impact before they happen."
                accent
                subtitle="Powered by Aether Simulation Engine"
              />
            </div>
          </div>
        </section>

        {/* ─── HOW IT WORKS ─── */}
        <section className="border-t border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-900/30">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="text-center mb-16">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.landing.howTitle}</h2>
              <p className="mt-3 text-muted-foreground">{t.landing.howSubtitle}</p>
            </div>
            <div className="grid gap-0 sm:grid-cols-3">
              <StepCard
                step="01"
                icon={<Search className="size-5" />}
                title={t.landing.howStep1Title}
                description={t.landing.howStep1Desc}
                isLast={false}
              />
              <StepCard
                step="02"
                icon={<Zap className="size-5" />}
                title={t.landing.howStep2Title}
                description={t.landing.howStep2Desc}
                isLast={false}
              />
              <StepCard
                step="03"
                icon={<BarChart3 className="size-5" />}
                title={t.landing.howStep3Title}
                description={t.landing.howStep3Desc}
                isLast
              />
            </div>
          </div>
        </section>

        {/* ─── SOURCES ─── */}
        <section className="border-t border-stone-200 dark:border-stone-800">
          <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24">
            <div className="flex flex-col lg:flex-row gap-12 lg:gap-16 items-center">
              <div className="lg:w-1/2">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="size-5 text-[var(--brand)]" />
                  <span className="text-xs uppercase tracking-[0.15em] font-medium text-[var(--brand)]">
                    {t.landing.sourcesSubtitle}
                  </span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">{t.landing.sourcesTitle}</h2>
                <p className="mt-4 text-muted-foreground leading-relaxed">{t.landing.sourcesList}</p>
              </div>
              <div className="lg:w-1/2">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {[
                    "Reuters",
                    "BBC",
                    "Al Jazeera",
                    "Financial Times",
                    "Bloomberg",
                    "The Guardian",
                    "Politico EU",
                    "SCMP",
                    "AP News",
                  ].map((source) => (
                    <div
                      key={source}
                      className="flex items-center gap-2 px-3 py-2.5 rounded border border-stone-200 dark:border-stone-800 bg-background text-sm"
                    >
                      <Database className="size-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate text-xs font-medium">{source}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─── BOTTOM CTA ─── */}
        {!user && (
          <section className="border-t border-stone-200 dark:border-stone-800 bg-stone-950 dark:bg-stone-900">
            <div className="mx-auto max-w-6xl px-6 py-20 sm:py-24 text-center">
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">{t.landing.ctaTitle}</h2>
              <p className="mt-3 text-stone-400 max-w-lg mx-auto">{t.landing.ctaSubtitle}</p>
              <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  to="/auth?signup"
                  className="flex items-center gap-2 rounded bg-[var(--brand)] px-8 py-3 text-sm font-medium text-white hover:bg-[var(--brand-hover)] transition-colors"
                >
                  {t.landing.getStarted}
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/auth"
                  className="flex items-center gap-2 rounded border border-stone-600 px-8 py-3 text-sm font-medium text-stone-300 hover:text-white hover:border-stone-400 transition-colors"
                >
                  {t.landing.logIn}
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-stone-200 dark:border-stone-800">
        <div className="mx-auto max-w-6xl px-6 py-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ImageWithFallback
                src="/logo.svg"
                alt={t.common.logoAlt}
                className="h-6 w-auto object-contain dark:invert"
              />
              <span className="text-xs text-muted-foreground">&copy; 2026 {t.landing.footerCopyright}</span>
            </div>
            <div className="flex items-center gap-4">
              {user ? (
                <Link to="/dashboard" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                  {t.landing.goToDashboard}
                </Link>
              ) : (
                <>
                  <Link to="/auth" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                    {t.landing.logIn}
                  </Link>
                  <Link
                    to="/auth?signup"
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {t.landing.createAccount}
                  </Link>
                </>
              )}
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ─── Sub-components ─── */

function MetricCard({
  icon,
  value,
  label,
  detail,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-stone-200 dark:border-stone-800 bg-background p-5 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div className="flex size-8 items-center justify-center rounded bg-stone-100 dark:bg-stone-800 text-muted-foreground">
          {icon}
        </div>
        <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">{detail}</span>
      </div>
      <div className="text-2xl font-bold tracking-tight leading-none">{value}</div>
      <div className="text-xs text-muted-foreground mt-1.5">{label}</div>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  accent,
  subtitle,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  accent: boolean;
  subtitle?: string;
}) {
  return (
    <div
      className={`group rounded-lg border-2 p-6 transition-colors ${
        accent
          ? "border-stone-200 dark:border-stone-800 hover:border-[var(--brand)] dark:hover:border-[var(--brand)]"
          : "border-stone-200 dark:border-stone-800 hover:border-stone-400 dark:hover:border-stone-600"
      } bg-background`}
    >
      <div className="mb-4 flex size-10 items-center justify-center rounded bg-stone-100 dark:bg-stone-800 text-foreground group-hover:bg-[var(--brand)] group-hover:text-white transition-colors">
        {icon}
      </div>
      <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
      {subtitle && (
        <p className="mt-2 text-[10px] font-medium text-[var(--brand)] opacity-70">{subtitle}</p>
      )}
    </div>
  );
}

function StepCard({
  step,
  icon,
  title,
  description,
  isLast,
}: {
  step: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  isLast: boolean;
}) {
  return (
    <div
      className={`relative text-center px-6 py-8 ${!isLast ? "sm:border-r border-stone-200 dark:border-stone-800" : ""}`}
    >
      <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full border-2 border-stone-200 dark:border-stone-700 bg-background text-muted-foreground">
        {icon}
      </div>
      <div className="mb-2 text-xs font-bold text-[var(--brand)] tracking-[0.15em]">{step}</div>
      <h3 className="text-sm font-bold tracking-tight">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}
