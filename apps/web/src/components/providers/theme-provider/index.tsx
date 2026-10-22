import { useEffect } from "react";
import { syncNativeSystemBars } from "@/lib/native/system-bars";
import { useUserPreferencesStore } from "@/store/user-preferences";

function applyTheme(resolved: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(resolved);
  syncNativeSystemBars(resolved);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useUserPreferencesStore();

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    if (theme === "system") {
      applyTheme(mediaQuery.matches ? "dark" : "light");
    } else {
      applyTheme(theme);
    }

    const handleChange = (e: MediaQueryListEvent) => {
      if (theme === "system") {
        applyTheme(e.matches ? "dark" : "light");
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [theme]);

  return <>{children}</>;
}
