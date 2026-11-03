import { useMutation, useQueryClient } from "@tanstack/react-query";
import updateVersion from "@/fetchers/version/update-version";

function useUpdateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateVersion,
    onSuccess: (version) => {
      void queryClient.invalidateQueries({
        queryKey: ["versions", version.workspaceId],
      });
      // Boards and task pages show the version by name.
      void queryClient.invalidateQueries({ queryKey: ["tasks"] });
      void queryClient.invalidateQueries({ queryKey: ["task"] });
    },
  });
}

export default useUpdateVersion;
