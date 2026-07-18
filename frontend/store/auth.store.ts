import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User } from "@/types/auth.types";

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  setSession: (user: User, tokens: { access: string; refresh: string }) => void;
  setAccessToken: (token: string) => void;
  setUser: (user: User) => void;
  logout: () => void;
  isAuthenticated: () => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,

      setSession: (user, tokens) => {
        if (typeof document !== "undefined") document.cookie = "hms_session=1; path=/; max-age=604800; SameSite=Lax";
        set({ user, accessToken: tokens.access, refreshToken: tokens.refresh });
      },

      setAccessToken: (token) => set({ accessToken: token }),

      setUser: (user) => set({ user }),

      logout: () => {
        if (typeof document !== "undefined") document.cookie = "hms_session=; path=/; max-age=0";
        set({ user: null, accessToken: null, refreshToken: null });
      },

      isAuthenticated: () => !!get().accessToken,
    }),
    {
      name: "hms-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    }
  )
);
