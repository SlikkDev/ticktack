import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

const getWorkspaces = async () => {
  const { data, error } = await authClient.organization.list();

  if (error) {
    throw new ApiClientError(error, "Failed to fetch workspaces");
  }

  return data || [];
};

export default getWorkspaces;
