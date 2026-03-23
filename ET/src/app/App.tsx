import { useEffect, useCallback, Suspense, lazy, Component, type ReactNode } from "react";
import { BrowserRouter, Routes, Route, Navigate, Outlet } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { useAuthStore } from "@/stores/auth";
import { useLocaleStore } from "@/stores/locale";
import { useAppStore } from "@/stores/app";
import { useSettingsStore } from "@/stores/settings";
import { ProtectedRoute } from "@/app/components/ProtectedRoute";
import { LeftNav } from "@/app/components/LeftNav";
import { RightSidebar } from "@/app/components/RightSidebar";
import { TopBar } from "@/app/components/TopBar";
import { OnboardingOverlay } from "@/app/components/OnboardingOverlay";
import { Toaster } from "@/app/components/ui/sonner";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const LandingPage = lazy(() => import("@/pages/LandingPage").then((m) => ({ default: m.LandingPage })));
const AuthPage = lazy(() => import("@/pages/AuthPage").then((m) => ({ default: m.AuthPage })));
const CommandCenter = lazy(() => import("@/pages/CommandCenter").then((m) => ({ default: m.CommandCenter })));
const SettingsLayout = lazy(() => import("@/pages/SettingsLayout").then((m) => ({ default: m.SettingsLayout })));
const UserProfileSettings = lazy(() =>
  import("@/pages/UserProfileSettings").then((m) => ({ default: m.UserProfileSettings })),
);
const CompanySettings = lazy(() => import("@/pages/CompanySettings").then((m) => ({ default: m.CompanySettings })));
const CanvasPage = lazy(() => import("@/pages/CanvasPage").then((m) => ({ default: m.CanvasPage })));
const PasswordResetPage = lazy(() =>
  import("@/pages/PasswordResetPage").then((m) => ({ default: m.PasswordResetPage })),
);
const SourcesPage = lazy(() => import("@/pages/SourcesPage").then((m) => ({ default: m.SourcesPage })));
const AnalystPage = lazy(() => import("@/pages/AnalystPage").then((m) => ({ default: m.AnalystPage })));
const BookmarksSettings = lazy(() =>
  import("@/pages/BookmarksSettings").then((m) => ({ default: m.BookmarksSettings })),
);
const HistorySettings = lazy(() => import("@/pages/HistorySettings").then((m) => ({ default: m.HistorySettings })));
const AiProfileSettings = lazy(() =>
  import("@/pages/AiProfileSettings").then((m) => ({ default: m.AiProfileSettings })),
);

function DashboardLayout() {
  const leftNavOpen = useAppStore((s) => s.leftNavOpen);
  const rightSidebarOpen = useAppStore((s) => s.rightSidebarOpen);
  const needsOnboarding = useAuthStore((s) => s.needsOnboarding);
  const fetchSources = useAppStore((s) => s.fetchSources);
  const fetchRecentArticles = useAppStore((s) => s.fetchRecentArticles);

  const loadData = useCallback(async () => {
    await Promise.all([fetchSources(), fetchRecentArticles()]);
    // Derive system health from fetched data
    const { recentArticles, sources } = useAppStore.getState();
    const totalArticleCount = sources.reduce((sum, s) => sum + s.article_count, 0);
    const latestArticle = recentArticles[0];
    const lastIngestionTime = latestArticle?.published_at ?? null;
    useAppStore.setState({ lastIngestionTime, totalArticleCount });
  }, [fetchSources, fetchRecentArticles]);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <ProtectedRoute>
      <div className="flex flex-col h-[100dvh] w-[100dvw] bg-stone-100 dark:bg-[#0f1011] overflow-hidden text-stone-800 dark:text-stone-200">
        <div className="flex flex-1 overflow-hidden">
          <LeftNav collapsed={!leftNavOpen} />
          <div className="flex-1 overflow-hidden m-2 sm:m-3 md:m-4 border border-stone-300 dark:border-stone-800/50 rounded-xl bg-white dark:bg-[#0a0a0b] shadow-2xl flex flex-col relative min-w-0">
            <TopBar />
            <Outlet />
          </div>
          <RightSidebar collapsed={!rightSidebarOpen} />
        </div>
      </div>
      {needsOnboarding && <OnboardingOverlay />}
    </ProtectedRoute>
  );
}

function ErrorFallback({ error, onReset }: { error: Error; onReset: () => void }) {
  const t = useLocaleStore((s) => s.t);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center max-w-md p-8">
        <h1 className="text-2xl font-bold mb-2">{t.common.errorTitle}</h1>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button
          onClick={onReset}
          className="px-4 py-2 bg-foreground text-background rounded hover:opacity-90 transition-opacity"
        >
          {t.common.errorReload}
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <ErrorFallback
          error={this.state.error}
          onReset={() => {
            this.setState({ error: null });
            window.location.reload();
          }}
        />
      );
    }
    return this.props.children;
  }
}

function LoadingFallback() {
  const t = useLocaleStore((s) => s.t);
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">{t.common.loading}</div>
    </div>
  );
}

export default function App() {
  const initialize = useAuthStore((s) => s.initialize);
  const textSize = useSettingsStore((s) => s.textSize);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    document.documentElement.dataset.textSize = textSize;
  }, [textSize]);

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <BrowserRouter>
            <Suspense fallback={<LoadingFallback />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/auth/reset" element={<PasswordResetPage />} />
                <Route element={<DashboardLayout />}>
                  <Route path="/dashboard" element={<CommandCenter />} />
                  <Route path="/canvas/:storyId" element={<CanvasPage />} />
                  <Route path="/sources" element={<SourcesPage />} />
                  <Route path="/bookmarks" element={<BookmarksSettings />} />
                  <Route path="/history" element={<HistorySettings />} />
                  <Route path="/analyst" element={<AnalystPage />} />
                  <Route path="/settings" element={<SettingsLayout />}>
                    <Route path="profile" element={<UserProfileSettings />} />
                    <Route path="company" element={<CompanySettings />} />
                    <Route path="ai-profile" element={<AiProfileSettings />} />
                    <Route index element={<Navigate to="profile" replace />} />
                  </Route>
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
          <Toaster />
        </ThemeProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
