// UI locales are allowlisted before an unauthenticated request can select email
// copy. Languages without an email translation retain the templates' English
// fallback; a missing preference uses TickTack's Hebrew instance default.
const supportedLocales = [
  "he-IL",
  "az-AZ",
  "mk-MK",
  "nl-NL",
  "de-DE",
  "el-GR",
  "en-US",
  "es-ES",
  "fr-FR",
  "hi-IN",
  "id-ID",
  "it-IT",
  "ja-JP",
  "ko-KR",
  "pl-PL",
  "pt-BR",
  "ru-RU",
  "tr-TR",
  "uk-UA",
  "vi-VN",
  "zh-CN",
  "zh-TW",
] as const;

function supportedLocale(value?: string | null) {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return undefined;
  return (
    supportedLocales.find((locale) => locale.toLowerCase() === normalized) ??
    supportedLocales.find((locale) => locale.split("-")[0] === normalized)
  );
}

export function resolveAuthEmailLocale(
  storedLocale?: string | null,
  requestedLocale?: string | null,
) {
  return (
    supportedLocale(storedLocale) ?? supportedLocale(requestedLocale) ?? "he-IL"
  );
}

export function getRequestedAuthEmailLocale(headers?: Headers | null) {
  return supportedLocale(headers?.get("x-ticktack-locale"));
}
