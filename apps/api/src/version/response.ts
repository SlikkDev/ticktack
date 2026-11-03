import { responseTimestamp, z } from "../openapi";

export const versionSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    name: z.string(),
    description: z.string().nullable(),
    releasedAt: responseTimestamp.nullable().openapi({
      description: "When the version was marked released; null while open.",
    }),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("Version");

export const versionWithCountSchema = versionSchema
  .extend({
    taskCount: z.number().int().nonnegative().openapi({
      description: "Tasks in this version across the workspace's projects.",
    }),
  })
  .openapi("VersionWithCount");

export const versionListSchema = z.array(versionWithCountSchema);
