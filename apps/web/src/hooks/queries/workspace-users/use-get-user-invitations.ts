import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { useQuery } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

function useGetUserInvitations() {
  return useQuery({
    queryKey: ["user-invitations"],
    queryFn: async () => {
      const { data, error } =
        await authClient.organization.listUserInvitations();

      if (error) {
        throw new ApiClientError(error, "Failed to get user invitations");
      }

      return data;
    },
  });
}

export default useGetUserInvitations;
