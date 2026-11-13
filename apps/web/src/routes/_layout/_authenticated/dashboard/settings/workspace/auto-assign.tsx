import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import PageTitle from "@/components/page-title";
import { WorkspaceStatusAssignRules } from "@/components/settings/status-assign-rules/workspace-status-assign-rules";

export const Route = createFileRoute(
  "/_layout/_authenticated/dashboard/settings/workspace/auto-assign",
)({
  component: RouteComponent,
});

function RouteComponent() {
  const { t } = useTranslation();

  return (
    <>
      <PageTitle title={t("settings:statusAssign.title")} />
      <WorkspaceStatusAssignRules />
    </>
  );
}
