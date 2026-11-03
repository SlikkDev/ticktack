import { MilestoneIcon, PlusIcon } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { SettingsCard } from "@/components/settings/settings-card";
import { SettingsEmpty } from "@/components/settings/settings-empty";
import { SettingsPage } from "@/components/settings/settings-page";
import { SettingsRowsSkeleton } from "@/components/settings/settings-rows-skeleton";
import { SettingsSection } from "@/components/settings/settings-section";
import { DeleteVersionDialog } from "@/components/settings/versions/delete-version-dialog";
import { VersionDialog } from "@/components/settings/versions/version-dialog";
import { VersionRow } from "@/components/settings/versions/version-row";
import type { WorkspaceVersion } from "@/components/settings/versions/workspace-version";
import { Button } from "@/components/ui/button";
import useGetVersionsByWorkspace from "@/hooks/queries/version/use-get-versions-by-workspace";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";

export function VersionsSettings() {
  const { t } = useTranslation();
  const { workspace, canManageSettings } = useWorkspacePermission();
  const canManage = canManageSettings();
  const workspaceId = workspace?.id ?? "";
  const versionsQuery = useGetVersionsByWorkspace(workspaceId);
  const versions = versionsQuery.data ?? [];

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingVersion, setEditingVersion] = useState<WorkspaceVersion | null>(
    null,
  );
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingVersion, setDeletingVersion] =
    useState<WorkspaceVersion | null>(null);

  const openVersionDialog = (version: WorkspaceVersion | null) => {
    setEditingVersion(version);
    setDialogOpen(true);
  };

  const openDeleteDialog = (version: WorkspaceVersion) => {
    setDeletingVersion(version);
    setDeleteOpen(true);
  };

  const newVersionButton = canManage ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => openVersionDialog(null)}
    >
      <PlusIcon aria-hidden="true" />
      {t("settings:workspaceVersions.newVersion")}
    </Button>
  ) : null;

  const renderVersions = () => {
    if (versionsQuery.isPending) return <SettingsRowsSkeleton />;
    if (versionsQuery.isError) {
      return (
        <p
          role="alert"
          className="px-4 py-3.5 text-destructive-foreground text-sm"
        >
          {t("settings:workspaceVersions.loadError")}
        </p>
      );
    }
    if (versions.length === 0) {
      return (
        <SettingsEmpty
          icon={<MilestoneIcon />}
          title={t("settings:workspaceVersions.emptyTitle")}
          description={t("settings:workspaceVersions.emptyDescription")}
          action={newVersionButton}
        />
      );
    }
    return versions.map((version) => (
      <VersionRow
        key={version.id}
        version={version}
        canManage={canManage}
        onEdit={openVersionDialog}
        onDelete={openDeleteDialog}
      />
    ));
  };

  return (
    <>
      <SettingsPage
        title={t("settings:workspaceVersions.title")}
        description={
          workspace?.name
            ? t("settings:workspaceVersions.subtitleWithWorkspace", {
                workspaceName: workspace.name,
              })
            : t("settings:workspaceVersions.subtitle")
        }
        actions={newVersionButton}
      >
        <SettingsSection
          title={t("settings:workspaceVersions.sectionTitle")}
          description={t("settings:workspaceVersions.sectionDescription")}
        >
          <SettingsCard>{renderVersions()}</SettingsCard>
        </SettingsSection>
      </SettingsPage>

      <VersionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        version={editingVersion}
        workspaceId={workspaceId}
      />
      <DeleteVersionDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        version={deletingVersion}
      />
    </>
  );
}
