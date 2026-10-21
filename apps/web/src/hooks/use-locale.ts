import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import type { AppLocale } from "@i18n/resources";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { authClient } from "@/lib/auth-client";
import { getBrowserLocale, resolveLocale } from "@/lib/i18n";
import { localeDirection } from "@/lib/i18n/direction";
import { rememberLocale } from "@/lib/i18n/preference";
import useAuth from "@/components/providers/auth-provider/hooks/use-auth";

export function useLocale() {
  const { i18n } = useTranslation();
  const queryClient = useQueryClient();
  const { refetchUser } = useAuth();

  const locale = useMemo(
    () => resolveLocale(i18n.resolvedLanguage, getBrowserLocale()),
    [i18n.resolvedLanguage],
  );

  const setLocale = async (nextLocale: AppLocale) => {
    const { error } = await authClient.updateUser({ locale: nextLocale });
    if (error) {
      throw new ApiClientError(error, "Failed to update locale");
    }

    const resolved = resolveLocale(nextLocale, null);
    rememberLocale(resolved);
    document.documentElement.lang = resolved;
    document.documentElement.dir = localeDirection(resolved);
    await queryClient.invalidateQueries({ queryKey: ["session"] });
    await i18n.changeLanguage(resolved);
    await refetchUser();
  };

  return {
    locale,
    setLocale,
  };
}
