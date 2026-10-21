import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

type DeleteWorkspaceRequest = {
  id: string;
};

const deleteWorkspace = async ({ id }: DeleteWorkspaceRequest) => {
  const { data, error } = await authClient.organization.delete({
    organizationId: id,
  });

  if (error) {
    throw new ApiClientError(error, "Failed to delete workspace");
  }

  return data;
};

export default deleteWorkspace;
