import getWorkspaces from "@/fetchers/workspace/get-workspaces";
import { authClient } from "@/lib/auth-client";

/**
 * The workspace an assistant action lands in: the session's active workspace
 * when the caller still belongs to it, otherwise the first one, which becomes
 * active. Null when the caller has no workspace yet.
 */
export async function resolveActiveWorkspaceId(): Promise<string | null> {
  const workspaces = await getWorkspaces();
  if (workspaces.length === 0) return null;

  const session = await authClient.getSession();
  const activeId = session?.data?.session?.activeOrganizationId;
  if (activeId && workspaces.some((workspace) => workspace.id === activeId)) {
    return activeId;
  }

  const first = workspaces[0];
  await authClient.organization.setActive({ organizationId: first.id });
  return first.id;
}
