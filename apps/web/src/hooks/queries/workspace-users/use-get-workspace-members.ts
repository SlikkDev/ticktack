import { useQuery } from "@tanstack/react-query";
import getWorkspaceMembers from "@/fetchers/workspace-user/get-workspace-members";

export function useGetWorkspaceMembers(workspaceId: string) {
  return useQuery({
    queryKey: ["workspace-users", workspaceId, "members"],
    queryFn: () => getWorkspaceMembers(workspaceId),
    enabled: !!workspaceId,
  });
}
