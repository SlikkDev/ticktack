import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";

export async function deleteAdminUser(userId: string) {
  const { data, error } = await authClient.admin.removeUser({ userId });

  if (error) {
    throw new ApiClientError(error, "");
  }

  return data;
}
