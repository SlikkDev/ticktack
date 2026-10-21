import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

type AcceptInvitationRequest = {
  invitationId: string;
};

function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({ invitationId }: AcceptInvitationRequest) => {
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });

      if (error) {
        throw new ApiClientError(error, "Failed to accept invitation");
      }

      return data;
    },
  });
}

export default useAcceptInvitation;
