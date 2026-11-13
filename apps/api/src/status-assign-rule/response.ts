import { responseTimestamp, z } from "../openapi";

export const statusAssignRuleSchema = z
  .object({
    id: z.string(),
    workspaceId: z.string(),
    projectId: z.string().nullable().openapi({
      description:
        "The project the rule belongs to, or null for a workspace rule that applies to every project.",
    }),
    status: z.string().openapi({
      description: "The status (column slug) that triggers the assignment.",
    }),
    assigneeId: z.string(),
    assigneeName: z.string().nullable(),
    createdAt: responseTimestamp,
    updatedAt: responseTimestamp,
  })
  .openapi("StatusAssignRule");

export const statusAssignRuleRowSchema = statusAssignRuleSchema
  .omit({ assigneeName: true })
  .openapi("StatusAssignRuleRow");

const statusAssignRuleListSchema = z.array(statusAssignRuleSchema);

export const workspaceStatusAssignRulesSchema = z
  .object({
    rules: statusAssignRuleListSchema,
    statuses: z
      .array(z.object({ slug: z.string(), name: z.string() }))
      .openapi({
        description:
          "Statuses used by the workspace's projects, deduplicated by slug.",
      }),
  })
  .openapi("WorkspaceStatusAssignRules");

export const projectStatusAssignRulesSchema = z
  .object({
    rules: statusAssignRuleListSchema.openapi({
      description: "Rules set on this project.",
    }),
    workspaceRules: statusAssignRuleListSchema.openapi({
      description:
        "Workspace rules. A project rule for the same status overrides them.",
    }),
  })
  .openapi("ProjectStatusAssignRules");
