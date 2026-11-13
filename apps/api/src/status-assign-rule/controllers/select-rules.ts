import { eq, type SQL } from "drizzle-orm";
import db from "../../database";
import { statusAssignRuleTable, userTable } from "../../database/schema";

export async function selectStatusAssignRules(where: SQL | undefined) {
  return db
    .select({
      id: statusAssignRuleTable.id,
      workspaceId: statusAssignRuleTable.workspaceId,
      projectId: statusAssignRuleTable.projectId,
      status: statusAssignRuleTable.status,
      assigneeId: statusAssignRuleTable.assigneeId,
      assigneeName: userTable.name,
      createdAt: statusAssignRuleTable.createdAt,
      updatedAt: statusAssignRuleTable.updatedAt,
    })
    .from(statusAssignRuleTable)
    .leftJoin(userTable, eq(statusAssignRuleTable.assigneeId, userTable.id))
    .where(where)
    .orderBy(statusAssignRuleTable.createdAt);
}
