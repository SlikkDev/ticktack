import { eventContext, subscribeToEvent } from "../events";
import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import { applyStatusAssignRule } from "./apply-status-assign-rule";
import deleteStatusAssignRule from "./controllers/delete-rule";
import getProjectStatusAssignRules from "./controllers/get-project-rules";
import getWorkspaceStatusAssignRules from "./controllers/get-workspace-rules";
import upsertStatusAssignRule from "./controllers/upsert-rule";
import {
  projectStatusAssignRulesSchema,
  statusAssignRuleRowSchema,
  workspaceStatusAssignRulesSchema,
} from "./response";
import {
  projectIdParam,
  projectRuleParam,
  upsertStatusAssignRuleBody,
  workspaceIdParam,
  workspaceRuleParam,
} from "./schema";

const manageWorkspaceRules = requireWorkspacePermission({
  workspace: ["manage_settings"],
});
const manageProjectRules = requireWorkspacePermission({
  project: ["update"],
});
const TAGS = ["Status Assign Rules"];
const upsertBody = {
  required: true,
  content: { "application/json": { schema: upsertStatusAssignRuleBody } },
} as const;

const getWorkspaceRulesRoute = createRoute({
  method: "get",
  operationId: "getWorkspaceStatusAssignRules",
  path: "/workspace/{workspaceId}",
  tags: TAGS,
  summary: "Get workspace status assign rules",
  description:
    "Get the workspace rules that assign a task to a user when it moves into a status, and the statuses its projects use.",
  middleware: [workspaceAccess.fromParam()] as const,
  request: { params: workspaceIdParam },
  responses: {
    200: jsonResponse("Workspace rules", workspaceStatusAssignRulesSchema),
    404: errorResponse("Workspace not found"),
  },
});

const upsertWorkspaceRuleRoute = createRoute({
  method: "put",
  operationId: "upsertWorkspaceStatusAssignRule",
  path: "/workspace/{workspaceId}",
  tags: TAGS,
  summary: "Upsert workspace status assign rule",
  description:
    "Assign tasks in every project of the workspace to a user when they move into a status. Replaces the workspace rule for that status.",
  middleware: [workspaceAccess.fromParam(), manageWorkspaceRules] as const,
  request: { params: workspaceIdParam, body: upsertBody },
  responses: {
    200: jsonResponse("The saved rule", statusAssignRuleRowSchema),
    400: errorResponse("Invalid body or unknown status"),
    403: errorResponse(
      "Missing workspace:manage_settings permission, or the user is not a workspace member",
    ),
    404: errorResponse("Workspace not found"),
  },
});

const deleteWorkspaceRuleRoute = createRoute({
  method: "delete",
  operationId: "deleteWorkspaceStatusAssignRule",
  path: "/workspace/{workspaceId}/{id}",
  tags: TAGS,
  summary: "Delete workspace status assign rule",
  description: "Delete a workspace rule. Returns the rule that was removed.",
  middleware: [workspaceAccess.fromParam(), manageWorkspaceRules] as const,
  request: { params: workspaceRuleParam },
  responses: {
    200: jsonResponse("The deleted rule", statusAssignRuleRowSchema),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Rule not found"),
  },
});

const getProjectRulesRoute = createRoute({
  method: "get",
  operationId: "getProjectStatusAssignRules",
  path: "/project/{projectId}",
  tags: TAGS,
  summary: "Get project status assign rules",
  description:
    "Get the project's rules and the workspace rules it inherits. A project rule overrides the workspace rule for the same status.",
  middleware: [workspaceAccess.fromProject("projectId")] as const,
  request: { params: projectIdParam },
  responses: {
    200: jsonResponse("Project rules", projectStatusAssignRulesSchema),
    403: errorResponse("No access to the project"),
    404: errorResponse("Project not found"),
  },
});

const upsertProjectRuleRoute = createRoute({
  method: "put",
  operationId: "upsertProjectStatusAssignRule",
  path: "/project/{projectId}",
  tags: TAGS,
  summary: "Upsert project status assign rule",
  description:
    "Assign tasks in this project to a user when they move into a status. Overrides the workspace rule for that status.",
  middleware: [
    workspaceAccess.fromProject("projectId"),
    manageProjectRules,
  ] as const,
  request: { params: projectIdParam, body: upsertBody },
  responses: {
    200: jsonResponse("The saved rule", statusAssignRuleRowSchema),
    400: errorResponse("Invalid body or unknown status"),
    403: errorResponse(
      "Missing project:update permission, or the user cannot access the project",
    ),
    404: errorResponse("Project not found"),
  },
});

const deleteProjectRuleRoute = createRoute({
  method: "delete",
  operationId: "deleteProjectStatusAssignRule",
  path: "/project/{projectId}/{id}",
  tags: TAGS,
  summary: "Delete project status assign rule",
  description:
    "Delete a project rule, so the workspace rule for that status applies again. Returns the rule that was removed.",
  middleware: [
    workspaceAccess.fromProject("projectId"),
    manageProjectRules,
  ] as const,
  request: { params: projectRuleParam },
  responses: {
    200: jsonResponse("The deleted rule", statusAssignRuleRowSchema),
    403: errorResponse("Missing project:update permission"),
    404: errorResponse("Rule not found"),
  },
});

const statusAssignRule = apiRouter()
  .openapi(getWorkspaceRulesRoute, async (c) =>
    c.json(
      await getWorkspaceStatusAssignRules(c.req.valid("param").workspaceId),
      200,
    ),
  )
  .openapi(upsertWorkspaceRuleRoute, async (c) =>
    c.json(
      await upsertStatusAssignRule(
        { workspaceId: c.req.valid("param").workspaceId },
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(deleteWorkspaceRuleRoute, async (c) => {
    const { workspaceId, id } = c.req.valid("param");
    return c.json(await deleteStatusAssignRule(id, { workspaceId }), 200);
  })
  .openapi(getProjectRulesRoute, async (c) =>
    c.json(
      await getProjectStatusAssignRules(c.req.valid("param").projectId),
      200,
    ),
  )
  .openapi(upsertProjectRuleRoute, async (c) =>
    c.json(
      await upsertStatusAssignRule(
        { projectId: c.req.valid("param").projectId },
        c.req.valid("json"),
      ),
      200,
    ),
  )
  .openapi(deleteProjectRuleRoute, async (c) => {
    const { projectId, id } = c.req.valid("param");
    return c.json(await deleteStatusAssignRule(id, { projectId }), 200);
  });

subscribeToEvent<{ taskId: string; newStatus: string; userId?: string }>(
  "task.status_changed",
  async (data) => {
    if (!data.taskId || !data.newStatus) return;
    // Leave the mover's event context so their own client also receives the
    // assignee change over the WebSocket.
    await eventContext.exit(() => applyStatusAssignRule(data));
  },
);

export default statusAssignRule;
