import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

export type GetActiveWorkspaceUsersRequest = {
  workspaceId: string;
};

async function getActiveWorkspaceUsers({
  workspaceId,
}: GetActiveWorkspaceUsersRequest) {
  const { data, error } = await authClient.organization.listMembers({
    query: {
      organizationId: workspaceId,
    },
  });

  if (error) {
    throw new ApiClientError(error, "Failed to fetch workspace users");
  }

  return data || [];
}

export default getActiveWorkspaceUsers;
