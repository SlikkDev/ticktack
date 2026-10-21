import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

export async function getAdminAccess() {
  const { data, error } = await authClient.admin.hasPermission({
    permissions: { user: ["list"] },
  });

  if (error) {
    if (error.status === 401 || error.status === 403) {
      return false;
    }
    throw new ApiClientError(error, "");
  }

  return data?.success === true;
}
