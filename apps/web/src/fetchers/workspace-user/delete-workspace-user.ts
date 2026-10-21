import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

export type DeleteWorkspaceUserRequest = {
  workspaceId: string;
  userId: string;
};

async function deleteWorkspaceUser({
  workspaceId,
  userId,
}: DeleteWorkspaceUserRequest) {
  const { data, error } = await authClient.organization.removeMember({
    organizationId: workspaceId,
    memberIdOrEmail: userId,
  });

  if (error) {
    throw new ApiClientError(error, "Failed to remove workspace member");
  }

  return data;
}

export default deleteWorkspaceUser;
