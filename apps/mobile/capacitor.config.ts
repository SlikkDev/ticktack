import type { CapacitorConfig } from "@capacitor/cli";

// The native shells load the web app that `pnpm --filter @kaneo/web build:native`
// writes to apps/web/dist. That build bakes in the API origin from
// apps/web/.env.native (override it with apps/web/.env.native.local).
const config: CapacitorConfig = {
  appId: "io.slikk.ticktack",
  appName: "TickTack",
  webDir: "../web/dist",
  // iOS serves the bundle from capacitor://localhost and Android from
  // https://localhost. Both origins must be listed in the API's CORS_ORIGINS.
  server: {
    androidScheme: "https",
  },
  ios: {
    // The web app pads its own safe areas (see apps/web/src/index.css), so the
    // WebView can extend under the status bar and home indicator.
    contentInset: "never",
  },
  plugins: {
    SystemBars: {
      // Capacitor publishes --safe-area-inset-* variables on Android WebViews
      // that cannot report env(safe-area-inset-*) themselves.
      insetsHandling: "css",
      initialViewportFitValueHint: "cover",
    },
  },
};

export default config;
