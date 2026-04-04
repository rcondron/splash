import { create } from "zustand";
import { persist } from "zustand/middleware";

type Theme = "light" | "dark" | "system";

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

function applyThemeClass(theme: Theme) {
  if (typeof window === "undefined") return;

  const root = document.documentElement;

  if (theme === "dark") {
    root.classList.add("dark");
  } else if (theme === "light") {
    root.classList.remove("dark");
  } else {
    // system
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    if (prefersDark) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }
}

const cycleOrder: Theme[] = ["light", "dark", "system"];

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: "system" as Theme,

      setTheme: (theme: Theme) => {
        applyThemeClass(theme);
        set({ theme });
      },

      toggleTheme: () => {
        const current = get().theme;
        const idx = cycleOrder.indexOf(current);
        const next = cycleOrder[(idx + 1) % cycleOrder.length];
        applyThemeClass(next);
        set({ theme: next });
      },
    }),
    {
      name: "splash-theme",
      onRehydrateStorage: () => (state) => {
        if (state) {
          applyThemeClass(state.theme);
        }
      },
    },
  ),
);
