import { Trash2Icon } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ConfirmDialog } from "@/components/settings/confirm-dialog";
import type { WorkspaceVersion } from "@/components/settings/versions/workspace-version";
import useDeleteVersion from "@/hooks/mutations/version/use-delete-version";
import { toast } from "@/lib/toast";

type DeleteVersionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  version: WorkspaceVersion | null;
};

export function DeleteVersionDialog({
  open,
  onOpenChange,
  version,
}: DeleteVersionDialogProps) {
  const { t } = useTranslation();
  const deleteVersion = useDeleteVersion();

  const handleConfirm = async () => {
    if (!version) return;

    try {
      await deleteVersion.mutateAsync({ id: version.id });
      toast.success(t("settings:workspaceVersions.deleteSuccess"), {
        icon: Trash2Icon,
      });
      onOpenChange(false);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:workspaceVersions.deleteError"),
      );
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (next || !deleteVersion.isPending) onOpenChange(next);
      }}
      title={t("settings:workspaceVersions.deleteConfirmTitle", {
        name: version?.name ?? "",
      })}
      description={
        version?.taskCount
          ? t("settings:workspaceVersions.deleteConfirmDescription", {
              count: version.taskCount,
            })
          : t("settings:workspaceVersions.deleteConfirmDescriptionEmpty")
      }
      confirmLabel={t("settings:workspaceVersions.deleteVersion")}
      pendingLabel={t("common:actions.deleting")}
      pending={deleteVersion.isPending}
      onConfirm={handleConfirm}
    />
  );
}
