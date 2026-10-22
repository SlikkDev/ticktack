import { apiRouter, createRoute, jsonResponse } from "../openapi";
import { requireApiKeyScope } from "../utils/require-workspace-permission";
import getWatchSummary, {
  WATCH_PERMISSIONS,
  WATCH_TASKS_LIMIT,
} from "./controllers/get-watch-summary";
import { watchSummarySchema } from "./response";

const getWatchSummaryRoute = createRoute({
  method: "get",
  operationId: "getWatchSummary",
  path: "/summary",
  tags: ["Watch"],
  summary: "Get my watch summary",
  description: `A compact view for smart watch companions: the caller's open tasks across every workspace they can read (soonest due first, undated last, at most ${WATCH_TASKS_LIMIT}), the columns of the projects those tasks sit in, the caller's running timer, and their unread notification count. Completed and archived tasks and archived projects are excluded. Quick actions use updateTaskStatus, createTimeEntry and updateTimeEntry.`,
  middleware: [requireApiKeyScope(WATCH_PERMISSIONS)] as const,
  responses: {
    200: jsonResponse("The caller's watch summary", watchSummarySchema),
  },
});

const watch = apiRouter().openapi(getWatchSummaryRoute, async (c) =>
  c.json(await getWatchSummary(c.get("userId")), 200),
);

export default watch;
