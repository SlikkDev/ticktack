import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

export type InviteWorkspaceMemberRequest = {
  workspaceId: string;
  email: string;
  role?: "owner" | "admin" | "member";
};

const inviteWorkspaceMember = async ({
  workspaceId,
  email,
  role = "member",
}: InviteWorkspaceMemberRequest) => {
  const { data, error } = await authClient.organization.inviteMember({
    organizationId: workspaceId,
    email,
    role,
  });

  if (error) {
    throw new ApiClientError(error, "Failed to invite workspace member");
  }

  return data;
};

export default inviteWorkspaceMember;
