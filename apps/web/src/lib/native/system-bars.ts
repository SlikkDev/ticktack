import { Capacitor, SystemBars, SystemBarsStyle } from "@capacitor/core";

/** Keeps status bar icons readable against the active theme's background. */
export function syncNativeSystemBars(theme: "light" | "dark"): void {
  if (!Capacitor.isNativePlatform()) return;
  void SystemBars.setStyle({
    style: theme === "dark" ? SystemBarsStyle.Dark : SystemBarsStyle.Light,
  }).catch(() => {});
}
