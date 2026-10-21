import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

function useGetApiKeys() {
  return useQuery({
    queryKey: ["api-keys"],
    queryFn: async () => {
      const result = await authClient.apiKey.list();

      if (result.error) {
        throw new ApiClientError(result.error);
      }

      return result.data.apiKeys || [];
    },
  });
}

export default useGetApiKeys;
