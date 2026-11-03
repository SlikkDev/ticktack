import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateTaskVersion from "@/fetchers/task/update-task-version";
import {
  getBoardCacheVersion,
  markBoardCacheChanged,
} from "@/lib/board-cache-version";
import { invalidateMyWork } from "@/lib/invalidate-my-work";
import { updateBoardTaskCache } from "@/lib/update-board-task-cache";
import type Task from "@/types/task";

type UpdateTaskVersionInput = {
  task: Task;
  versionId: string | null;
  versionName: string | null;
};

export function useUpdateTaskVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ task, versionId }: UpdateTaskVersionInput) =>
      updateTaskVersion(task.id, versionId),
    onMutate: ({ task }: UpdateTaskVersionInput) => {
      markBoardCacheChanged(queryClient, task.projectId, task.id);
      return {
        version: getBoardCacheVersion(queryClient, task.projectId, task.id),
      };
    },
    onSuccess: (updated, { task, versionName }, context) => {
      invalidateMyWork(queryClient);
      queryClient.invalidateQueries({ queryKey: ["task", task.id] });
      updateBoardTaskCache(
        queryClient,
        task.projectId,
        task.id,
        {
          versionId: updated.versionId ?? null,
          versionName: updated.versionId ? versionName : null,
        },
        context?.version,
      );
      queryClient.invalidateQueries({ queryKey: ["versions"] });
      queryClient.invalidateQueries({ queryKey: ["activities", task.id] });
    },
  });
}
