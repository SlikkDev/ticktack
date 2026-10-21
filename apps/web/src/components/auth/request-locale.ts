import { type AppLocale, isSupportedLocale } from "@i18n/resources";
import { getStoredLocale, ticktackDefaultLocale } from "@/lib/i18n/preference";

export function getAuthRequestLocale(language?: string): AppLocale {
  return language && isSupportedLocale(language)
    ? language
    : (getStoredLocale() ?? ticktackDefaultLocale);
}
