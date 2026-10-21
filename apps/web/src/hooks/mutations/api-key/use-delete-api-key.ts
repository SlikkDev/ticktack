import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

function useDeleteApiKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (keyId: string) => {
      const result = await authClient.apiKey.delete({
        keyId: keyId,
      });

      if (result.error) {
        throw new ApiClientError(result.error);
      }

      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["api-keys"] });
    },
  });
}

export default useDeleteApiKey;
