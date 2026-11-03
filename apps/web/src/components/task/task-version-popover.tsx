import { CircleDashed, Milestone } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { useUpdateTaskVersion } from "@/hooks/mutations/task/use-update-task-version";
import useGetVersionsByWorkspace from "@/hooks/queries/version/use-get-versions-by-workspace";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";

const NO_VERSION = ":none";

type TaskVersionPopoverProps = {
  task: Task;
  workspaceId: string;
  children: React.ReactNode;
};

export default function TaskVersionPopover({
  task,
  workspaceId,
  children,
}: TaskVersionPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutateAsync: updateTaskVersion } = useUpdateTaskVersion();
  const { canUpdateTasks } = useWorkspacePermission();
  const { data: versions = [] } = useGetVersionsByWorkspace(workspaceId);

  if (!canUpdateTasks()) return <>{children}</>;

  const changeVersion = async (value: string) => {
    setOpen(false);
    const version = versions.find((candidate) => candidate.id === value);
    try {
      await updateTaskVersion({
        task,
        versionId: version?.id ?? null,
        versionName: version?.name ?? null,
      });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:popover.version.updateError"),
      );
    }
  };

  // Released versions are listed last: new work rarely goes into them.
  const options = [
    {
      value: NO_VERSION,
      label: t("tasks:version.none"),
      icon: <CircleDashed className="size-3.5 text-muted-foreground" />,
      selected: !task.versionId,
    },
    ...versions.map((version) => ({
      value: version.id,
      label: version.name,
      icon: (
        <Milestone
          className={
            version.releasedAt
              ? "size-3.5 text-muted-foreground/60"
              : "size-3.5 text-muted-foreground"
          }
        />
      ),
      selected: task.versionId === version.id,
    })),
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <OptionMenu
          label={t("tasks:version.label")}
          placeholder={t("tasks:popover.version.searchPlaceholder")}
          options={options}
          onSelect={changeVersion}
        />
      </PopoverContent>
    </Popover>
  );
}
