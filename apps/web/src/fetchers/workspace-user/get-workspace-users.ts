import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

export type GetWorkspaceUsersRequest = {
  workspaceId: string;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
};

async function getWorkspaceUsers({
  workspaceId,
  limit,
  offset,
  sortBy,
  sortDirection,
}: GetWorkspaceUsersRequest) {
  const { data, error } = await authClient.organization.listMembers({
    query: {
      organizationId: workspaceId,
      limit,
      offset,
      sortBy,
      sortDirection,
    },
  });

  if (error) {
    throw new ApiClientError(error, "Failed to fetch workspace users");
  }

  return data || [];
}

export default getWorkspaceUsers;
