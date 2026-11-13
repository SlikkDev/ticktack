import { UserRoundCheckIcon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SettingsEmpty } from "@/components/settings/settings-empty";
import { SettingsPage } from "@/components/settings/settings-page";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsRowsSkeleton } from "@/components/settings/settings-rows-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { StatusAssignRulesCard } from "@/components/settings/status-assign-rules/status-assign-rules-card";
import { useGetWorkspaceStatusAssignRules } from "@/hooks/queries/status-assign-rule/use-get-workspace-status-assign-rules";
import { useGetWorkspaceMembers } from "@/hooks/queries/workspace-users/use-get-workspace-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";

export function WorkspaceStatusAssignRules() {
  const { t } = useTranslation();
  const { workspace, canManageSettings } = useWorkspacePermission();
  const workspaceId = workspace?.id ?? "";
  const rules = useGetWorkspaceStatusAssignRules(workspaceId);
  const members = useGetWorkspaceMembers(workspaceId);

  const renderRules = () => {
    if (rules.isPending || members.isPending)
      return (
        <SettingsCard>
          <SettingsRowsSkeleton />
        </SettingsCard>
      );
    if (rules.isError || members.isError)
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
    if (rules.data.statuses.length === 0)
      return (
        <SettingsCard>
          <SettingsEmpty
            icon={<UserRoundCheckIcon />}
            title={t("settings:statusAssign.emptyTitle")}
            description={t("settings:statusAssign.emptyDescription")}
          />
        </SettingsCard>
      );
    return (
      <StatusAssignRulesCard
        scope={{ type: "workspace", id: workspaceId }}
        statuses={rules.data.statuses}
        rules={rules.data.rules}
        members={members.data}
        canEdit={canManageSettings()}
      />
    );
  };

  return (
    <SettingsPage
      title={t("settings:statusAssign.title")}
      description={t("settings:statusAssign.workspaceSubtitle")}
    >
      <SettingsSection
        title={t("settings:statusAssign.sectionTitle")}
        description={t("settings:statusAssign.workspaceSectionDescription")}
      >
        {renderRules()}
      </SettingsSection>
    </SettingsPage>
  );
}
