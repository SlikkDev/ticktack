import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ChangePasswordSettings } from "@/components/account/change-password/change-password-settings";
import { PasskeySettings } from "@/components/account/passkey-settings";
import useGetConfig from "@/hooks/queries/config/use-get-config";
import PageTitle from "@/components/page-title";
import { SettingsPage } from "@/components/settings/settings-page";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/account/security",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();
  const { data: config } = useGetConfig();

  return (
    <>
      <PageTitle title={t("settings:securityPage.pageTitle")} />
      <SettingsPage
        title={t("settings:securityPage.title")}
        description={t("settings:securityPage.subtitle")}
      >
        {config?.hasPasskeys ? <PasskeySettings /> : null}
        {config && !config.passwordlessAuth ? <ChangePasswordSettings /> : null}
      </SettingsPage>
    </>
  );
}
