import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

type RejectInvitationRequest = {
  invitationId: string;
};

function useRejectInvitation() {
  return useMutation({
    mutationFn: async ({ invitationId }: RejectInvitationRequest) => {
      const { data, error } = await authClient.organization.rejectInvitation({
        invitationId,
      });

      if (error) {
        throw new ApiClientError(error, "Failed to reject invitation");
      }

      return data;
    },
  });
}

export default useRejectInvitation;
