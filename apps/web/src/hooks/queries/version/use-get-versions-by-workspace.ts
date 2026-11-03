import { useQuery } from "@tanstack/react-query";
import getVersionsByWorkspace from "@/fetchers/version/get-versions-by-workspace";

function useGetVersionsByWorkspace(workspaceId: string) {
  return useQuery({
    enabled: Boolean(workspaceId),
    queryKey: ["versions", workspaceId],
    queryFn: () => getVersionsByWorkspace({ workspaceId }),
  });
}

export default useGetVersionsByWorkspace;
