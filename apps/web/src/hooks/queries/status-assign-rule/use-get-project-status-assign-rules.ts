import { useQuery } from "@tanstack/react-query";
import getProjectStatusAssignRules from "@/fetchers/status-assign-rule/get-project-status-assign-rules";
import { statusAssignRulesQueryKey } from "@/fetchers/status-assign-rule/status-assign-scope";

export function useGetProjectStatusAssignRules(projectId: string) {
  return useQuery({
    queryKey: statusAssignRulesQueryKey({ type: "project", id: projectId }),
    queryFn: () => getProjectStatusAssignRules(projectId),
    enabled: !!projectId,
  });
}
