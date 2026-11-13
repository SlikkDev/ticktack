import { and, eq, isNull, or } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import {
  projectTable,
  statusAssignRuleTable,
  taskTable,
} from "../database/schema";
import updateTaskAssignee from "../task/controllers/update-task-assignee";
import { pickStatusAssignRule } from "./pick-status-assign-rule";

export async function applyStatusAssignRule({
  taskId,
  newStatus,
  userId,
}: {
  taskId: string;
  newStatus: string;
  userId?: string;
}) {
  const [task] = await db
    .select({
      projectId: taskTable.projectId,
      status: taskTable.status,
      assigneeId: taskTable.userId,
      workspaceId: projectTable.workspaceId,
    })
    .from(taskTable)
    .innerJoin(projectTable, eq(taskTable.projectId, projectTable.id))
    .where(eq(taskTable.id, taskId))
    .limit(1);
  // The task moved on before this ran; the newer change triggers its own rule.
  if (!task || task.status !== newStatus) return;

  const rules = await db
    .select({
      projectId: statusAssignRuleTable.projectId,
      assigneeId: statusAssignRuleTable.assigneeId,
    })
    .from(statusAssignRuleTable)
    .where(
      and(
        eq(statusAssignRuleTable.status, newStatus),
        or(
          eq(statusAssignRuleTable.projectId, task.projectId),
          and(
            isNull(statusAssignRuleTable.projectId),
            eq(statusAssignRuleTable.workspaceId, task.workspaceId),
          ),
        ),
      ),
    );

  const rule = pickStatusAssignRule(rules, task.projectId);
  if (!rule || rule.assigneeId === task.assigneeId) return;

  try {
    await updateTaskAssignee({
      id: taskId,
      userId: rule.assigneeId,
      currentUserId: userId,
    });
  } catch (error) {
    // The rule's user left the workspace or lost access to this project.
    if (error instanceof HTTPException && error.status === 403) return;
    throw error;
  }
}
