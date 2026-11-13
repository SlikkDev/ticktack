import type { Context } from "hono";
import { requireEntitlement } from "../billing/require-entitlement-middleware";
import { ApiError } from "../errors/api-error";
import {
  apiRouter,
  type BaseVariables,
  createRoute,
  errorResponse,
  jsonResponse,
  z,
} from "../openapi";
import {
  hasWorkspacePermission,
  requireWorkspacePermission,
} from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import addTaskWatcher from "./controllers/add-task-watcher";
import getTaskWatchers from "./controllers/get-task-watchers";
import removeTaskWatcher from "./controllers/remove-task-watcher";
import "./notify-watchers";
import { taskWatcherListSchema, taskWatcherSchema } from "./response";
import { taskIdParam, taskWatcherParam } from "./schema";

// Anyone who can read a task may watch it themselves. Adding or removing
// someone else changes who hears about the task, like assigning it does.
async function assertCanManageWatcher(c: Context, targetUserId: string) {
  if (targetUserId === c.get("userId")) return;
  if (await hasWorkspacePermission(c, { task: ["assign"] })) return;
  throw new ApiError(403, {
    message: "Insufficient permissions",
    code: "MISSING_PERMISSION",
    missingPermissions: ["task:assign"],
  });
}

const getTaskWatchersRoute = createRoute({
  method: "get",
  operationId: "getTaskWatchers",
  path: "/{taskId}",
  tags: ["Task Watchers"],
  summary: "List task watchers",
  description:
    "List the users watching a task, oldest first. Watchers are notified of status changes, assignee changes, and new comments on the task. Users who lost access to the task are omitted.",
  middleware: [workspaceAccess.fromTaskId("taskId")] as const,
  request: { params: taskIdParam },
  responses: {
    200: jsonResponse("The task's watchers", taskWatcherListSchema),
    403: errorResponse("No access to the project"),
    404: errorResponse("Task not found"),
  },
});

const addTaskWatcherRoute = createRoute({
  method: "put",
  operationId: "addTaskWatcher",
  path: "/{taskId}/{userId}",
  tags: ["Task Watchers"],
  summary: "Add task watcher",
  description:
    "Start watching a task, or add another workspace member as a watcher. Watching yourself needs task:read; adding someone else needs task:assign. Adding an existing watcher returns it unchanged.",
  middleware: [
    workspaceAccess.fromTaskId("taskId"),
    requireWorkspacePermission({ task: ["read"] }),
    requireEntitlement,
  ] as const,
  request: { params: taskWatcherParam },
  responses: {
    200: jsonResponse("The watcher", taskWatcherSchema),
    403: errorResponse(
      "No access to the project, missing permission, or the user cannot see the task",
    ),
    404: errorResponse("Task not found"),
  },
});

const removeTaskWatcherRoute = createRoute({
  method: "delete",
  operationId: "removeTaskWatcher",
  path: "/{taskId}/{userId}",
  tags: ["Task Watchers"],
  summary: "Remove task watcher",
  description:
    "Stop watching a task, or remove another member's watch. Removing yourself needs task:read; removing someone else needs task:assign.",
  middleware: [
    workspaceAccess.fromTaskId("taskId"),
    requireWorkspacePermission({ task: ["read"] }),
  ] as const,
  request: { params: taskWatcherParam },
  responses: {
    200: jsonResponse(
      "The removed watch",
      z.object({ taskId: z.string(), userId: z.string() }),
    ),
    403: errorResponse("No access to the project, or missing permission"),
    404: errorResponse("Task not found, or the user is not watching it"),
  },
});

const taskWatcher = apiRouter<BaseVariables & { workspaceId: string }>()
  .openapi(getTaskWatchersRoute, async (c) =>
    c.json(await getTaskWatchers(c.req.valid("param").taskId), 200),
  )
  .openapi(addTaskWatcherRoute, async (c) => {
    const { taskId, userId } = c.req.valid("param");
    await assertCanManageWatcher(c, userId);
    return c.json(
      await addTaskWatcher({ taskId, userId, currentUserId: c.get("userId") }),
      200,
    );
  })
  .openapi(removeTaskWatcherRoute, async (c) => {
    const { taskId, userId } = c.req.valid("param");
    await assertCanManageWatcher(c, userId);
    return c.json(
      await removeTaskWatcher({
        taskId,
        userId,
        currentUserId: c.get("userId"),
      }),
      200,
    );
  });

export default taskWatcher;
