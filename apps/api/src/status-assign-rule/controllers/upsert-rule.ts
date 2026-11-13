import { and, eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { columnTable, statusAssignRuleTable } from "../../database/schema";
import {
  assertAssignableUser,
  filterAssignableUsers,
  getProjectWorkspaceId,
  NOT_ASSIGNABLE,
} from "../../utils/assert-assignable-user";
import { listWorkspaceStatuses } from "./list-workspace-statuses";

const INVALID_STATUS = "Status does not exist";

async function assertProjectRuleTarget(
  projectId: string,
  status: string,
  assigneeId: string,
) {
  const workspaceId = await getProjectWorkspaceId(projectId);
  const column = await db.query.columnTable.findFirst({
    where: and(
      eq(columnTable.projectId, projectId),
      eq(columnTable.slug, status),
    ),
  });
  if (!column) throw new HTTPException(400, { message: INVALID_STATUS });
  await assertAssignableUser(assigneeId, workspaceId, projectId);
  return workspaceId;
}

async function assertWorkspaceRuleTarget(
  workspaceId: string,
  status: string,
  assigneeId: string,
) {
  const statuses = await listWorkspaceStatuses(workspaceId);
  if (!statuses.some((candidate) => candidate.slug === status))
    throw new HTTPException(400, { message: INVALID_STATUS });
  if (!(await filterAssignableUsers([assigneeId], workspaceId)).has(assigneeId))
    throw new HTTPException(403, { message: NOT_ASSIGNABLE });
}

async function upsertStatusAssignRule(
  scope: { workspaceId: string } | { projectId: string },
  { status, assigneeId }: { status: string; assigneeId: string },
) {
  let projectId: string | null = null;
  let workspaceId: string;
  if ("projectId" in scope) {
    projectId = scope.projectId;
    workspaceId = await assertProjectRuleTarget(projectId, status, assigneeId);
  } else {
    workspaceId = scope.workspaceId;
    await assertWorkspaceRuleTarget(workspaceId, status, assigneeId);
  }

  const target = projectId
    ? {
        target: [statusAssignRuleTable.projectId, statusAssignRuleTable.status],
        targetWhere: sql`project_id is not null`,
      }
    : {
        target: [
          statusAssignRuleTable.workspaceId,
          statusAssignRuleTable.status,
        ],
        targetWhere: sql`project_id is null`,
      };

  const [rule] = await db
    .insert(statusAssignRuleTable)
    .values({ workspaceId, projectId, status, assigneeId })
    .onConflictDoUpdate({
      ...target,
      set: { assigneeId, workspaceId, updatedAt: new Date() },
    })
    .returning();

  if (!rule)
    throw new HTTPException(500, { message: "Failed to save the rule" });
  return rule;
}

export default upsertStatusAssignRule;
