import { type AppLocale, isSupportedLocale } from "@i18n/resources";

export const ticktackDefaultLocale: AppLocale = "he-IL";
const storageKey = "ticktack.locale";

export function getStoredLocale(): AppLocale | null {
  try {
    const value = localStorage.getItem(storageKey);
    return value && isSupportedLocale(value) ? value : null;
  } catch {
    return null;
  }
}

export function rememberLocale(locale: AppLocale): void {
  try {
    localStorage.setItem(storageKey, locale);
  } catch {
    // Private browsing may disable storage; the current session still works.
  }
}
