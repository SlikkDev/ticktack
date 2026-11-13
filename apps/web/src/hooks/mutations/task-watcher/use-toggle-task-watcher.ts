import { useMutation, useQueryClient } from "@tanstack/react-query";
import addTaskWatcher from "@/fetchers/task-watcher/add-task-watcher";
import removeTaskWatcher from "@/fetchers/task-watcher/remove-task-watcher";

function useToggleTaskWatcher(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      userId,
      watching,
    }: {
      userId: string;
      watching: boolean;
    }) =>
      watching
        ? addTaskWatcher({ taskId, userId })
        : removeTaskWatcher({ taskId, userId }),
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: ["task-watchers", taskId] }),
  });
}

export default useToggleTaskWatcher;
