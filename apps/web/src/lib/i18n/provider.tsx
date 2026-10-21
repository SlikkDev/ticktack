import { DirectionProvider } from "@base-ui/react/direction-provider";
import { Direction } from "radix-ui";
import { type PropsWithChildren, useEffect } from "react";
import { I18nextProvider, useTranslation } from "react-i18next";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";
import {
  getBrowserLocale,
  i18n,
  preloadNamespaces,
  resolveLocale,
} from "./index";
import { localeDirection } from "./direction";
import { getStoredLocale, ticktackDefaultLocale } from "./preference";

export function AppI18nProvider({ children }: PropsWithChildren) {
  const { user } = useAuth();

  const { i18n: currentI18n } = useTranslation();
  const resolvedLocale = resolveLocale(
    user?.locale ?? getStoredLocale() ?? ticktackDefaultLocale,
    getBrowserLocale(),
  );
  const direction = localeDirection(
    currentI18n.resolvedLanguage ?? resolvedLocale,
  );

  useEffect(() => {
    void i18n
      .changeLanguage(resolvedLocale)
      .then(() => preloadNamespaces(resolvedLocale));
    document.documentElement.lang = resolvedLocale;
    document.documentElement.dir = localeDirection(resolvedLocale);
  }, [resolvedLocale]);

  return (
    <I18nextProvider i18n={i18n}>
      <DirectionProvider direction={direction}>
        <Direction.Provider dir={direction}>{children}</Direction.Provider>
      </DirectionProvider>
    </I18nextProvider>
  );
}
