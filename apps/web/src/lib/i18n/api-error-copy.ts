import i18n from "i18next";

export function isHebrewErrorLocale(): boolean {
  return /^he(?:-|$)/i.test(i18n.language ?? i18n.resolvedLanguage ?? "");
}

export function translateApiError(
  key: string,
  values: Record<string, string | number> = {},
): string {
  const hebrew = isHebrewErrorLocale();
  const fallback =
    key === "common:error.messages.server"
      ? hebrew
        ? "אירעה שגיאה בשרת. יש לנסות שוב מאוחר יותר."
        : "Server error. Please try again later."
      : hebrew
        ? "אירעה שגיאה לא צפויה."
        : "An unexpected error occurred.";

  // A missing Hebrew bundle must not fall through to English server copy.
  return (
    i18n.t(key, {
      ...values,
      lng: hebrew ? "he-IL" : i18n.language,
      ...(hebrew ? { fallbackLng: false } : {}),
      defaultValue: fallback,
    }) || fallback
  );
}
