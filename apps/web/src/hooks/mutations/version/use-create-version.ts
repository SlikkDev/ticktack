import { useMutation, useQueryClient } from "@tanstack/react-query";
import createVersion from "@/fetchers/version/create-version";

function useCreateVersion() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createVersion,
    onSuccess: (version) => {
      void queryClient.invalidateQueries({
        queryKey: ["versions", version.workspaceId],
      });
    },
  });
}

export default useCreateVersion;
