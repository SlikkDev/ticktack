import { useQuery } from "@tanstack/react-query";
import getWorkspaceStatusAssignRules from "@/fetchers/status-assign-rule/get-workspace-status-assign-rules";
import { statusAssignRulesQueryKey } from "@/fetchers/status-assign-rule/status-assign-scope";

export function useGetWorkspaceStatusAssignRules(workspaceId: string) {
  return useQuery({
    queryKey: statusAssignRulesQueryKey({ type: "workspace", id: workspaceId }),
    queryFn: () => getWorkspaceStatusAssignRules(workspaceId),
    enabled: !!workspaceId,
  });
}
