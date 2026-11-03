import {
  apiRouter,
  createRoute,
  errorResponse,
  jsonResponse,
} from "../openapi";
import { requireWorkspacePermission } from "../utils/require-workspace-permission";
import { workspaceAccess } from "../utils/workspace-access-middleware";
import createVersion from "./controllers/create-version";
import deleteVersion from "./controllers/delete-version";
import listVersions from "./controllers/list-versions";
import updateVersion from "./controllers/update-version";
import { versionListSchema, versionSchema } from "./response";
import {
  createVersionBody,
  listVersionsQuery,
  updateVersionBody,
  versionParam,
  workspaceIdParam,
} from "./schema";

const manageVersions = requireWorkspacePermission({
  workspace: ["manage_settings"],
});

const listVersionsRoute = createRoute({
  method: "get",
  operationId: "getWorkspaceVersions",
  path: "/workspace/{workspaceId}",
  tags: ["Versions"],
  summary: "List workspace versions",
  description:
    "List the versions (releases) of a workspace with how many tasks each one holds. Open versions come first, newest first.",
  middleware: [workspaceAccess.fromParam()] as const,
  request: { params: workspaceIdParam, query: listVersionsQuery },
  responses: {
    200: jsonResponse("Versions in the workspace", versionListSchema),
    404: errorResponse("Workspace not found"),
  },
});

const createVersionRoute = createRoute({
  method: "post",
  operationId: "createVersion",
  path: "/",
  tags: ["Versions"],
  summary: "Create version",
  description:
    "Create a version in a workspace. Tasks from any project of the workspace can then be assigned to it.",
  middleware: [workspaceAccess.fromBody(), manageVersions] as const,
  request: {
    body: {
      required: true,
      content: { "application/json": { schema: createVersionBody } },
    },
  },
  responses: {
    200: jsonResponse("The created version", versionSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Workspace not found"),
    409: errorResponse("A version with this name already exists"),
  },
});

const updateVersionRoute = createRoute({
  method: "put",
  operationId: "updateVersion",
  path: "/{id}",
  tags: ["Versions"],
  summary: "Update version",
  description:
    "Rename or describe a version, or mark it released. Releasing records the release time; tasks keep their version.",
  middleware: [workspaceAccess.fromVersion(), manageVersions] as const,
  request: {
    params: versionParam,
    body: {
      required: true,
      content: { "application/json": { schema: updateVersionBody } },
    },
  },
  responses: {
    200: jsonResponse("The updated version", versionSchema),
    400: errorResponse("Invalid body"),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Version not found"),
    409: errorResponse("A version with this name already exists"),
  },
});

const deleteVersionRoute = createRoute({
  method: "delete",
  operationId: "deleteVersion",
  path: "/{id}",
  tags: ["Versions"],
  summary: "Delete version",
  description:
    "Delete a version. Tasks in it stay where they are and simply lose the version.",
  middleware: [workspaceAccess.fromVersion(), manageVersions] as const,
  request: { params: versionParam },
  responses: {
    200: jsonResponse("The deleted version", versionSchema),
    403: errorResponse("Missing workspace:manage_settings permission"),
    404: errorResponse("Version not found"),
  },
});

const version = apiRouter()
  .openapi(listVersionsRoute, async (c) => {
    const { workspaceId } = c.req.valid("param");
    const { released } = c.req.valid("query");
    return c.json(
      await listVersions(workspaceId, {
        released: released === undefined ? undefined : released === "true",
      }),
      200,
    );
  })
  .openapi(createVersionRoute, async (c) => {
    const { workspaceId, name, description } = c.req.valid("json");
    return c.json(
      await createVersion({
        workspaceId,
        name,
        description,
        userId: c.get("userId"),
      }),
      200,
    );
  })
  .openapi(updateVersionRoute, async (c) => {
    const { id } = c.req.valid("param");
    const { name, description, released } = c.req.valid("json");
    return c.json(
      await updateVersion({
        id,
        name,
        description,
        released,
        userId: c.get("userId"),
      }),
      200,
    );
  })
  .openapi(deleteVersionRoute, async (c) => {
    const { id } = c.req.valid("param");
    return c.json(await deleteVersion(id, c.get("userId")), 200);
  });

export default version;
