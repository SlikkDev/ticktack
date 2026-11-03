import { z } from "../openapi";

export const VERSION_NAME_MAX = 100;
export const VERSION_DESCRIPTION_MAX = 2000;

export const versionParam = z.object({ id: z.string() });

export const workspaceIdParam = z.object({ workspaceId: z.string() });

export const listVersionsQuery = z.object({
  released: z.enum(["true", "false"]).optional().openapi({
    description:
      "Only released (`true`) or unreleased (`false`) versions. Omit for all.",
  }),
});

const versionName = z.string().trim().min(1).max(VERSION_NAME_MAX);
const versionDescription = z
  .string()
  .trim()
  .max(VERSION_DESCRIPTION_MAX)
  .nullable();

export const createVersionBody = z.object({
  workspaceId: z.string(),
  name: versionName.openapi({
    description: "Unique within the workspace, e.g. `v1.4.0`.",
  }),
  description: versionDescription.optional(),
});

export const updateVersionBody = z.object({
  name: versionName.optional(),
  description: versionDescription.optional().openapi({
    description: "Send null or an empty string to clear it.",
  }),
  released: z.boolean().optional().openapi({
    description:
      "True marks the version as released now; false reopens it. Omit to leave it unchanged.",
  }),
});
