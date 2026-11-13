import { z } from "../openapi";

export const workspaceIdParam = z.object({ workspaceId: z.string() });

export const projectIdParam = z.object({ projectId: z.string() });

export const workspaceRuleParam = z.object({
  workspaceId: z.string(),
  id: z.string(),
});

export const projectRuleParam = z.object({
  projectId: z.string(),
  id: z.string(),
});

export const upsertStatusAssignRuleBody = z.object({
  status: z.string().min(1).openapi({
    description: "The status (column slug) that triggers the assignment.",
  }),
  assigneeId: z.string().min(1).openapi({
    description: "The user tasks are assigned to when they enter the status.",
  }),
});
