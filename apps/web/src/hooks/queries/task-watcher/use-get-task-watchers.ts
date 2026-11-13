import { useQuery } from "@tanstack/react-query";
import getTaskWatchers from "@/fetchers/task-watcher/get-task-watchers";

function useGetTaskWatchers(taskId: string) {
  return useQuery({
    queryKey: ["task-watchers", taskId],
    queryFn: () => getTaskWatchers(taskId),
    enabled: !!taskId,
  });
}

export default useGetTaskWatchers;
