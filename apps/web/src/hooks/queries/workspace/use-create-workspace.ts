import { useMutation } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { ApiClientError } from "@/lib/i18n/api-error-from-client";
import {
  createUniqueWorkspaceSlug,
  isWorkspaceSlugCollisionError,
} from "@/lib/utils/create-workspace-slug";

type CreateWorkspaceRequest = {
  name: string;
  description?: string;
  logo?: string;
  slug?: string;
  keepCurrentActiveOrganization?: boolean;
  userId?: string;
};

function useCreateWorkspace() {
  return useMutation({
    mutationFn: async ({
      name,
      description,
      logo,
      slug,
      keepCurrentActiveOrganization = false,
      userId,
    }: CreateWorkspaceRequest) => {
      const metadata = description ? { description } : undefined;
      const existingWorkspaces = slug
        ? []
        : ((await authClient.organization.list()).data ?? []);
      let workspaceSlug = slug
        ? slug
        : createUniqueWorkspaceSlug(
            name,
            existingWorkspaces.map((workspace) => workspace.slug),
          );
      let lastFailure: { code?: string; status?: number } | undefined;

      for (let attempt = 0; attempt < 5; attempt += 1) {
        const { data, error } = await authClient.organization.create({
          name,
          slug: workspaceSlug,
          logo: logo || undefined,
          metadata,
          keepCurrentActiveOrganization,
          userId: userId,
        });

        if (!error) {
          return data;
        }
        lastFailure = error;

        // Retry detection uses the upstream text, before the display message is localized.
        const createError = new Error(
          error.message || "Failed to create workspace",
        );

        if (slug || !isWorkspaceSlugCollisionError(createError)) {
          throw new ApiClientError(error, "Failed to create workspace");
        }

        workspaceSlug = createUniqueWorkspaceSlug(name, [
          ...existingWorkspaces.map((workspace) => workspace.slug),
          workspaceSlug,
        ]);
      }

      throw new ApiClientError({
        ...lastFailure,
        message: "Failed to create workspace",
      });
    },
  });
}

export default useCreateWorkspace;
