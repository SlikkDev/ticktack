import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { VersionsSettings } from "@/components/settings/versions/versions-settings";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/workspace/versions",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();

  return (
    <>
      <PageTitle title={t("settings:workspaceVersions.pageTitle")} />
      <VersionsSettings />
    </>
  );
}
