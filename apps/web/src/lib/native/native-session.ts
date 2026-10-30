import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeSession = {
  /** Base URL of the API that native code calls directly, ending in `/api`. */
  apiUrl: string;
  /**
   * Origin the web app is served from (`VITE_CLIENT_URL`). Native surfaces
   * that open the app on a page, such as the home screen widgets, build their
   * links on it; null when the build does not know it, and native code then
   * falls back to the API origin.
   */
  clientUrl: string | null;
  /** The Better Auth bearer token; null signs native code out. */
  token: string | null;
};

type NativeSessionPlugin = {
  setSession(session: NativeSession): Promise<void>;
};

// Implemented natively in apps/mobile (NativeSessionPlugin.swift and .java).
// iOS keeps the session for the Siri App Intents and the home screen widget
// and relays it to a paired Apple Watch; Android keeps it for the home screen
// widget and relays it to a paired Wear OS watch (Assistant actions open the
// app, which has its own copy). There is no web implementation: a browser has
// neither a widget nor a watch nor an assistant that runs outside the page.
const NativeSession = registerPlugin<NativeSessionPlugin>("NativeSession");

let urls: Pick<NativeSession, "apiUrl" | "clientUrl"> | null = null;

/** Remembers the URLs that later token changes are forwarded with. */
export function configureNativeSession(
  apiUrl: string,
  clientUrl: string | null = null,
): void {
  urls = { apiUrl, clientUrl };
}

/**
 * Hands the current session to native code. Siri, the widgets and the watch
 * call the API themselves with this token, so they must learn about every
 * sign-in, token refresh and sign-out. Outside the native shells this does
 * nothing.
 */
export async function pushNativeSession(token: string | null): Promise<void> {
  if (
    !urls ||
    !Capacitor.isNativePlatform() ||
    !Capacitor.isPluginAvailable("NativeSession")
  ) {
    return;
  }
  try {
    await NativeSession.setSession({ ...urls, token });
  } catch (error) {
    // The phone app keeps working without it; the next launch pushes again.
    console.warn("Could not update the native session", error);
  }
}
