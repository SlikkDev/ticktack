import { Capacitor, registerPlugin } from "@capacitor/core";

export type WatchSession = {
  /** Base URL of the API the watch calls directly, ending in `/api`. */
  apiUrl: string;
  /** The Better Auth bearer token; null signs the watch out. */
  token: string | null;
};

type WatchBridgePlugin = {
  setSession(session: WatchSession): Promise<void>;
};

// Implemented natively in apps/mobile (WatchBridgePlugin.swift and .java),
// which relays the session to a paired Apple Watch or Wear OS watch. There is
// no web implementation: a browser has no paired watch.
const WatchBridge = registerPlugin<WatchBridgePlugin>("WatchBridge");

let apiUrl: string | null = null;

/** Remembers the API origin that later token changes are forwarded with. */
export function configureWatchSession(url: string): void {
  apiUrl = url;
}

/**
 * Hands the current session to the watch. The watch app calls the API itself
 * with this token, so it must learn about every sign-in, token refresh and
 * sign-out. Outside the native shells this does nothing.
 */
export async function pushWatchSession(token: string | null): Promise<void> {
  if (
    !apiUrl ||
    !Capacitor.isNativePlatform() ||
    !Capacitor.isPluginAvailable("WatchBridge")
  ) {
    return;
  }
  try {
    await WatchBridge.setSession({ apiUrl, token });
  } catch (error) {
    // The phone app keeps working without a watch; the watch asks again
    // when it next opens.
    console.warn("Could not update the watch session", error);
  }
}
