import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Organization } from "@/lib/api-types";

// ─── Types ──────────────────────────────────────────────────────

type LoginPayload = Record<string, any>;

interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role?: string;
}

interface AuthState {
  user: User | null;
  organization: Organization | null;
  loading: boolean;
  hydrated: boolean;

  login: (payload: LoginPayload) => Promise<User>;
  register: (data: RegisterData) => Promise<User>;
  logout: () => Promise<void>;
  fetchMe: () => Promise<void>;
  setUser: (user: User | null) => void;
}

// ─── Store ──────────────────────────────────────────────────────

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      loading: true,
      hydrated: false,

      fetchMe: async () => {
        set({ loading: true });
        try {
          const res = await fetch("/api/auth/me");
          const json = await res.json();
          if (json.success && json.data) {
            set({
              user: json.data,
              organization: json.data.organization ?? null,
            });
          } else {
            set({ user: null, organization: null });
          }
        } catch {
          set({ user: null, organization: null });
        } finally {
          set({ loading: false, hydrated: true });
        }
      },

      login: async (payload) => {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Login failed");
        set({
          user: json.data.user,
          organization: json.data.user?.organization ?? null,
        });
        return json.data.user;
      },

      register: async (data) => {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });
        const json = await res.json();
        if (!json.success) throw new Error(json.error ?? "Registration failed");
        return json.data.user;
      },

      logout: async () => {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        await supabase.auth.signOut();
        set({ user: null, organization: null });
        window.location.href = "/login";
      },

      setUser: (user) => set({ user }),
    }),
    {
      name: "lbh-auth",
      partialize: (state) => ({
        user: state.user,
        organization: state.organization,
      }),
    }
  )
);
