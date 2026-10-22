import { Preferences } from "@capacitor/preferences";

// Preferences is sandboxed app storage (UserDefaults / SharedPreferences), not
// the keychain: it survives restarts and reinstall-free updates, but a device
// backup can include it. Replace this module with a secure-storage plugin if a
// stronger guarantee is required.
const STORAGE_KEY = "kaneo.session-token";

let sessionToken: string | null = null;

/** Loads the persisted token into memory. Call once before the first request. */
export async function loadSessionToken(): Promise<string | null> {
  const stored = await Preferences.get({ key: STORAGE_KEY });
  sessionToken = stored.value || null;
  return sessionToken;
}

export function getSessionToken(): string | null {
  return sessionToken;
}

export async function setSessionToken(token: string | null): Promise<void> {
  if (token === sessionToken) return;
  sessionToken = token;
  if (token) {
    await Preferences.set({ key: STORAGE_KEY, value: token });
  } else {
    await Preferences.remove({ key: STORAGE_KEY });
  }
}
