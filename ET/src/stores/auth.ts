import { create } from "zustand";
import type { User, Session, Subscription } from "@supabase/supabase-js";
import type { Profile } from "@/types/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { logger } from "@/lib/logger";

let authSubscription: Subscription | null = null;

/** Sanitize Supabase auth errors to avoid leaking internal details */
function sanitizeAuthError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("invalid login credentials") || lower.includes("invalid_credentials")) {
    return "Invalid email or password";
  }
  if (lower.includes("email not confirmed")) {
    return "Please confirm your email before logging in";
  }
  if (lower.includes("user already registered")) {
    return "An account with this email already exists";
  }
  if (lower.includes("password") && lower.includes("characters")) {
    return "Password must be at least 8 characters";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many attempts. Please try again later";
  }
  return "Authentication failed. Please try again";
}

type AuthState = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  initialized: boolean;
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

/** Fetch profile, swallowing errors so auth doesn't hang */
async function fetchProfile(userId: string): Promise<Profile | null> {
  try {
    const { data } = await supabase.from("profiles").select("*").eq("id", userId).single();
    return data as Profile | null;
  } catch {
    return null;
  }
}

/** Race a promise against a timeout — returns null on timeout */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return Promise.race([promise, new Promise<null>((resolve) => setTimeout(() => resolve(null), ms))]);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  session: null,
  profile: null,
  loading: true,
  initialized: false,

  /**
   * Initializes auth state: restores session from Supabase, fetches profile, and registers
   * an onAuthStateChange listener. Protected by a 3s hard timeout to prevent hanging.
   */
  initialize: async () => {
    if (get().initialized) return;

    // No Supabase configured — activate dev mode with mock user
    if (!isSupabaseConfigured()) {
      logger.info("Supabase not configured — activating dev mode with mock user");
      set({
        user: { id: "dev-user", email: "dev@jaegeren.local" } as unknown as User,
        loading: false,
        initialized: true,
      });
      return;
    }

    // Hard timeout: if init takes > 3s, stop loading and show auth page
    const timeout = setTimeout(() => {
      if (!get().initialized) {
        set({ user: null, session: null, profile: null, loading: false, initialized: true });
      }
    }, 3000);

    try {
      // Unsubscribe any previous listener
      if (authSubscription) {
        authSubscription.unsubscribe();
        authSubscription = null;
      }

      // Register auth state change listener for future events (sign-in, sign-out, token refresh)
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          // Don't await — fire and forget to avoid blocking signInWithPassword
          withTimeout(fetchProfile(session.user.id), 2000).then((profile) => {
            set({ user: session.user, session, profile, loading: false, initialized: true });
          });
        } else {
          set({ user: null, session: null, profile: null, loading: false, initialized: true });
        }
      });
      authSubscription = subscription;

      // Try to get current session (with 2.5s timeout to prevent hanging)
      const sessionResult = await withTimeout(supabase.auth.getSession(), 2500);

      // Timeout or error — show auth page
      if (!sessionResult) {
        set({ loading: false, initialized: true });
        clearTimeout(timeout);
        return;
      }

      const {
        data: { session },
        error: sessionError,
      } = sessionResult;

      // Stale/invalid token — clear and show auth page
      if (sessionError) {
        supabase.auth.signOut().catch(() => {});
        set({ loading: false, initialized: true });
        clearTimeout(timeout);
        return;
      }

      // Valid session — fetch profile
      if (session?.user) {
        const profile = await withTimeout(fetchProfile(session.user.id), 2000);
        set({ user: session.user, session, profile, loading: false, initialized: true });
      } else {
        // No session — show auth page
        set({ loading: false, initialized: true });
      }
    } catch (e) {
      logger.error("Auth initialization error", { error: e instanceof Error ? e.message : String(e) });
      set({ user: null, session: null, profile: null, loading: false, initialized: true });
    }

    clearTimeout(timeout);
  },

  /** Signs in with email/password. Returns a sanitized error message on failure to avoid leaking internals. */
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: sanitizeAuthError(error.message) };
    // Directly set user so we don't rely solely on onAuthStateChange
    if (data.session?.user) {
      const profile = await withTimeout(fetchProfile(data.session.user.id), 2000);
      set({ user: data.session.user, session: data.session, profile, loading: false, initialized: true });
    }
    return { error: null };
  },

  /** Creates a new account and auto-signs in if email verification is disabled. Returns sanitized errors. */
  signUp: async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });
    if (error) return { error: sanitizeAuthError(error.message) };
    // Directly set user if auto-confirmed (no email verification)
    if (data.session?.user) {
      const profile = await withTimeout(fetchProfile(data.session.user.id), 2000);
      set({ user: data.session.user, session: data.session, profile, loading: false, initialized: true });
    }
    return { error: null };
  },

  signOut: async () => {
    // Unsubscribe auth listener
    if (authSubscription) {
      authSubscription.unsubscribe();
      authSubscription = null;
    }
    await supabase.auth
      .signOut()
      .catch((e) => logger.error("Sign-out error", { error: e instanceof Error ? e.message : String(e) }));
    set({ user: null, session: null, profile: null });
    // Reset app store to clear user-scoped data
    const { useAppStore } = await import("@/stores/app");
    useAppStore.getState().resetStore();
  },
}));
