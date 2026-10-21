/**
 * Calendar weekdays use JavaScript's Sunday=0 convention. Locale week data
 * uses Monday=1 through Sunday=7. Fall back for browsers without getWeekInfo.
 */
export function isLocaleWeekend(date: Date, locale = "en-US"): boolean {
  const parsed = new Intl.Locale(locale);
  const localeWithWeekInfo = parsed as Intl.Locale & {
    getWeekInfo?: () => { weekend: number[] };
    weekInfo?: { weekend: number[] };
  };
  const weekend =
    localeWithWeekInfo.getWeekInfo?.().weekend ??
    localeWithWeekInfo.weekInfo?.weekend ??
    (parsed.region === "IL" || parsed.language === "he" ? [5, 6] : [6, 7]);
  const weekday = date.getDay() || 7;
  return weekend.includes(weekday);
}
