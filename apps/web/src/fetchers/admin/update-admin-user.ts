import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import { authClient } from "@/lib/auth-client";
import type { UpdateAdminUserRequest } from "./types";

export async function updateAdminUser({
  userId,
  name,
  email,
  role,
}: UpdateAdminUserRequest) {
  const { data, error } = await authClient.admin.updateUser({
    userId,
    data: { name, email, ...(role === undefined ? {} : { role }) },
  });

  if (error) {
    throw new ApiClientError(error, "");
  }

  return data;
}
