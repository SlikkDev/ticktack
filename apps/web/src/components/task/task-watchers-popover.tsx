import { useState } from "react";
import { useTranslation } from "react-i18next";
import { OptionMenu } from "@/components/common/option-menu/option-menu";
import { useAuth } from "@/components/providers/auth-provider/hooks/use-auth";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import useToggleTaskWatcher from "@/hooks/mutations/task-watcher/use-toggle-task-watcher";
import useGetTaskWatchers from "@/hooks/queries/task-watcher/use-get-task-watchers";
import useGetProjectMembers from "@/hooks/queries/workspace-users/use-get-project-members";
import { useWorkspacePermission } from "@/hooks/use-workspace-permission";
import { toast } from "@/lib/toast";
import type Task from "@/types/task";
import { assigneeMenuOptions } from "./menus/assignee-menu-options";

type TaskWatchersPopoverProps = {
  task: Task;
  workspaceId: string;
  children: React.ReactNode;
};

export default function TaskWatchersPopover({
  task,
  workspaceId,
  children,
}: TaskWatchersPopoverProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { canAssignTasks } = useWorkspacePermission();
  const { data: watchers = [] } = useGetTaskWatchers(task.id);
  const { data: members = [] } = useGetProjectMembers({
    workspaceId,
    projectId: task.projectId,
  });
  const { mutateAsync: toggleWatcher } = useToggleTaskWatcher(task.id);

  // Without task:assign, people can only watch or unwatch the task themselves.
  const choices = canAssignTasks()
    ? members
    : members.filter((member) => member.id === user?.id);
  const watching = new Set(watchers.map((watcher) => watcher.userId));
  // Reuse the assignee rows, minus their "Unassigned" entry.
  const options = assigneeMenuOptions(choices, null, "")
    .slice(1)
    .map((option) => ({ ...option, selected: watching.has(option.value) }));

  const toggle = async (userId: string) => {
    try {
      await toggleWatcher({ userId, watching: !watching.has(userId) });
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : t("tasks:watchers.updateError"),
      );
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent className="w-60 p-0" align="start">
        <OptionMenu
          label={t("tasks:watchers.label")}
          placeholder={t("tasks:watchers.placeholder")}
          options={options}
          onSelect={toggle}
        />
      </PopoverContent>
    </Popover>
  );
}
