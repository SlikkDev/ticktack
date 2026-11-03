import {
  MilestoneIcon,
  PencilIcon,
  RotateCcwIcon,
  RocketIcon,
  Trash2Icon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  type RowAction,
  RowActionsMenu,
} from "@/components/settings/row-actions-menu";
import { SettingsRow } from "@/components/settings/settings-row";
import { StatusBadge } from "@/components/settings/status-badge";
import type { WorkspaceVersion } from "@/components/settings/versions/workspace-version";
import useUpdateVersion from "@/hooks/mutations/version/use-update-version";
import { cn } from "@/lib/cn";
import { formatDateShort } from "@/lib/format";
import { toast } from "@/lib/toast";

type VersionRowProps = {
  version: WorkspaceVersion;
  canManage: boolean;
  onEdit: (version: WorkspaceVersion) => void;
  onDelete: (version: WorkspaceVersion) => void;
};

export function VersionRow({
  version,
  canManage,
  onEdit,
  onDelete,
}: VersionRowProps) {
  const { t } = useTranslation();
  const updateVersion = useUpdateVersion();
  const released = Boolean(version.releasedAt);

  const toggleReleased = async () => {
    try {
      await updateVersion.mutateAsync({ id: version.id, released: !released });
      toast.success(
        t(
          released
            ? "settings:workspaceVersions.reopenSuccess"
            : "settings:workspaceVersions.releaseSuccess",
        ),
        { icon: released ? RotateCcwIcon : RocketIcon },
      );
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("settings:workspaceVersions.updateError"),
      );
    }
  };

  const actions: RowAction[] = canManage
    ? [
        {
          id: "edit",
          label: t("settings:workspaceVersions.editVersion"),
          icon: PencilIcon,
          onSelect: () => onEdit(version),
        },
        {
          id: "release",
          label: t(
            released
              ? "settings:workspaceVersions.reopen"
              : "settings:workspaceVersions.release",
          ),
          icon: released ? RotateCcwIcon : RocketIcon,
          disabled: updateVersion.isPending,
          onSelect: () => void toggleReleased(),
        },
        {
          id: "delete",
          label: t("settings:workspaceVersions.deleteVersion"),
          icon: Trash2Icon,
          destructive: true,
          onSelect: () => onDelete(version),
        },
      ]
    : [];

  const description = [
    t("settings:workspaceVersions.taskCount", { count: version.taskCount }),
    version.releasedAt
      ? t("settings:workspaceVersions.releasedOn", {
          date: formatDateShort(version.releasedAt),
        })
      : null,
    version.description,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <SettingsRow
      className={cn(
        canManage && "relative transition-colors hover:bg-accent/40",
      )}
      icon={
        <MilestoneIcon className={cn("size-3.5", released && "opacity-50")} />
      }
      title={
        canManage ? (
          <button
            type="button"
            aria-label={t("settings:workspaceVersions.editNamed", {
              name: version.name,
            })}
            onClick={() => onEdit(version)}
            className="max-w-full cursor-pointer truncate text-start outline-none after:absolute after:inset-0 focus-visible:after:ring-2 focus-visible:after:ring-ring focus-visible:after:ring-inset"
          >
            {version.name}
          </button>
        ) : (
          version.name
        )
      }
      titleClassName={released ? "text-muted-foreground" : undefined}
      badge={
        <StatusBadge tone={released ? "success" : "warning"}>
          {t(
            released
              ? "settings:workspaceVersions.statusReleased"
              : "settings:workspaceVersions.statusOpen",
          )}
        </StatusBadge>
      }
      description={description}
    >
      {actions.length > 0 ? (
        <div className="relative">
          <RowActionsMenu
            label={t("settings:workspaceVersions.rowActions", {
              name: version.name,
            })}
            actions={actions}
          />
        </div>
      ) : null}
    </SettingsRow>
  );
}
