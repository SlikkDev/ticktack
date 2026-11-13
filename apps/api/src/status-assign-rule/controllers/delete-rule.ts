import { and, eq, isNull } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { statusAssignRuleTable } from "../../database/schema";

async function deleteStatusAssignRule(
  id: string,
  scope: { workspaceId: string } | { projectId: string },
) {
  const scoped =
    "projectId" in scope
      ? eq(statusAssignRuleTable.projectId, scope.projectId)
      : and(
          eq(statusAssignRuleTable.workspaceId, scope.workspaceId),
          isNull(statusAssignRuleTable.projectId),
        );

  const [deleted] = await db
    .delete(statusAssignRuleTable)
    .where(and(eq(statusAssignRuleTable.id, id), scoped))
    .returning();

  if (!deleted) throw new HTTPException(404, { message: "Rule not found" });
  return deleted;
}

export default deleteStatusAssignRule;
