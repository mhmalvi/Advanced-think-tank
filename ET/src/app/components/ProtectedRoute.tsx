import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "@/stores/auth";
import { ContextualLoader } from "@/app/components/ContextualLoader";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading, initialized } = useAuthStore();
  const location = useLocation();

  if (!initialized || loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white dark:bg-stone-950">
        <ContextualLoader context="loading" />
      </div>
    );
  }

  if (!user) {
    // Use replace so back button skips this redirect — prevents login loop
    return <Navigate to="/auth" replace state={{ from: location.pathname }} />;
  }

  return <>{children}</>;
}
