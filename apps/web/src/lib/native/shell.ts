import { App } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { resolveApiBaseUrl } from "@kaneo/libs";
import { installNativeApiAuth } from "./api-auth";
import { loadSessionToken } from "./session-token";

/**
 * Prepares the Capacitor shell before the first render: tags the document for
 * native-only styles, restores the stored session token, and routes API
 * requests through bearer authentication. In a browser it does nothing.
 */
export async function prepareNativeShell(): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  document.documentElement.dataset.nativePlatform = Capacitor.getPlatform();
  try {
    const apiOrigin = new URL(resolveApiBaseUrl(import.meta.env.VITE_API_URL))
      .origin;
    await loadSessionToken();
    installNativeApiAuth(apiOrigin);
  } catch (error) {
    // Rendering must not depend on the shell; a failed restore only means
    // the user signs in again.
    console.warn("Could not prepare the native shell", error);
  }
}

/**
 * Universal links and Android app links for the web origin open the app; this
 * hands their path to the in-app router instead of leaving it on the launch
 * screen.
 */
export function listenForAppLinks(navigate: (href: string) => void): void {
  if (!Capacitor.isNativePlatform()) return;
  const clientUrl = import.meta.env.VITE_CLIENT_URL;
  if (!clientUrl) return;
  const clientOrigin = new URL(clientUrl).origin;
  void App.addListener("appUrlOpen", ({ url }) => {
    try {
      const target = new URL(url);
      if (target.origin !== clientOrigin) return;
      navigate(`${target.pathname}${target.search}${target.hash}`);
    } catch {
      // Ignore links that are not URLs.
    }
  });
}
