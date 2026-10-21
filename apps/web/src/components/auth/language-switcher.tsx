import { useTranslation } from "react-i18next";
import { preloadNamespaces } from "@/lib/i18n";
import { localeDirection } from "@/lib/i18n/direction";
import { rememberLocale } from "@/lib/i18n/preference";

export function LanguageSwitcher() {
  const { t, i18n } = useTranslation();
  const locale = i18n?.resolvedLanguage?.startsWith("he") ? "he-IL" : "en-US";

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <span>{t("settings:preferencesPage.language")}</span>
      <select
        aria-label={t("settings:preferencesPage.selectLanguage")}
        className="rounded-md border border-input bg-background px-2 py-1 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        value={locale}
        onChange={async (event) => {
          const next = event.target.value === "en-US" ? "en-US" : "he-IL";
          await preloadNamespaces(next);
          rememberLocale(next);
          await i18n.changeLanguage(next);
          document.documentElement.lang = next;
          document.documentElement.dir = localeDirection(next);
        }}
      >
        <option value="he-IL" lang="he" dir="rtl">
          עברית
        </option>
        <option value="en-US" lang="en" dir="ltr">
          English
        </option>
      </select>
    </label>
  );
}
