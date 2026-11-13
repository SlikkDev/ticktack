import { useTranslation } from "react-i18next";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsRowsSkeleton } from "@/components/settings/settings-rows-skeleton";
import { StatusAssignRulesCard } from "@/components/settings/status-assign-rules/status-assign-rules-card";
import { useGetColumns } from "@/hooks/queries/column/use-get-columns";
import { useGetProjectStatusAssignRules } from "@/hooks/queries/status-assign-rule/use-get-project-status-assign-rules";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";

export function ProjectStatusAssignRules({ projectId }: { projectId: string }) {
  const { t } = useTranslation();
  const { workspace, canUpdateProjects } = useWorkspacePermission();
  const columns = useGetColumns(projectId);
  const rules = useGetProjectStatusAssignRules(projectId);
  const members = useGetProjectMembers({
    workspaceId: workspace?.id ?? "",
    projectId,
  });

  if (columns.isPending || rules.isPending || members.isPending)
    return (
      <SettingsCard>
        <SettingsRowsSkeleton />
      </SettingsCard>
    );
  if (columns.isError || rules.isError || members.isError)
    return (
      <SettingsCard>
        <p
          role="alert"
          className="px-4 py-3.5 text-destructive-foreground text-sm"
        >
          {t("settings:statusAssign.loadError")}
        </p>
      </SettingsCard>
    );

  return (
    <StatusAssignRulesCard
      scope={{ type: "project", id: projectId }}
      statuses={columns.data}
      rules={rules.data.rules}
      inheritedRules={rules.data.workspaceRules}
      members={members.data}
      canEdit={canUpdateProjects()}
    />
  );
}
