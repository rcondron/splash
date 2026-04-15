import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clearAuthCookie, setAuthCookie } from "@/lib/auth-cookie";
import { User } from "@/types";

interface AuthState {
  user: User | null;
  token: string | null;
  matrixUserId: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string, matrixUserId?: string) => void;
  logout: () => void;
  setUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      matrixUserId: null,
      isAuthenticated: false,

      login: (user: User, token: string, matrixUserId?: string) => {
        if (typeof window !== "undefined") {
          localStorage.setItem("auth-token", token);
          setAuthCookie(token);
        }
        set({ user, token, matrixUserId: matrixUserId ?? null, isAuthenticated: true });
      },

      logout: () => {
        if (typeof window !== "undefined") {
          localStorage.removeItem("auth-token");
          clearAuthCookie();
        }
        set({ user: null, token: null, matrixUserId: null, isAuthenticated: false });
      },

      setUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        matrixUserId: state.matrixUserId,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state, error) => {
        if (error || !state?.token) return;
        if (typeof window !== "undefined") {
          localStorage.setItem("auth-token", state.token);
          setAuthCookie(state.token);
        }
      },
    },
  ),
);
