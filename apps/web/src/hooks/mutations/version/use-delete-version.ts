import { useMutation, useQueryClient } from "@tanstack/react-query";
import deleteVersion from "@/fetchers/version/delete-version";

function useDeleteVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteVersion,
    onSuccess: (version) => {
      void queryClient.invalidateQueries({
        queryKey: ["versions", version.workspaceId],
      });
      // Tasks that shipped in it now show no version.
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
}

export default useDeleteVersion;
