import { Capacitor, registerPlugin } from "@capacitor/core";

export type NativeSession = {
  /** Base URL of the API that native code calls directly, ending in `/api`. */
  apiUrl: string;
  /** The Better Auth bearer token; null signs native code out. */
  token: string | null;
};

type NativeSessionPlugin = {
  setSession(session: NativeSession): Promise<void>;
};

// Implemented natively in apps/mobile (NativeSessionPlugin.swift and .java).
// iOS keeps the session for the Siri App Intents and relays it to a paired
// Apple Watch; Android relays it to a paired Wear OS watch (Assistant actions
// open the app, which has its own copy). There is no web implementation: a
// browser has neither a watch nor an assistant that runs outside the page.
const NativeSession = registerPlugin<NativeSessionPlugin>("NativeSession");

let apiUrl: string | null = null;

/** Remembers the API base URL that later token changes are forwarded with. */
export function configureNativeSession(url: string): void {
  apiUrl = url;
}

/**
 * Hands the current session to native code. Siri and the watch call the API
 * themselves with this token, so they must learn about every sign-in, token
 * refresh and sign-out. Outside the native shells this does nothing.
 */
export async function pushNativeSession(token: string | null): Promise<void> {
  if (
    !apiUrl ||
    !Capacitor.isNativePlatform() ||
    !Capacitor.isPluginAvailable("NativeSession")
  ) {
    return;
  }
  try {
    await NativeSession.setSession({ apiUrl, token });
  } catch (error) {
    // The phone app keeps working without it; the next launch pushes again.
    console.warn("Could not update the native session", error);
  }
}
