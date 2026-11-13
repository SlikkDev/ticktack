import { and, eq, isNull } from "drizzle-orm";
import { statusAssignRuleTable } from "../../database/schema";
import { getProjectWorkspaceId } from "../../utils/assert-assignable-user";
import { selectStatusAssignRules } from "./select-rules";

async function getProjectStatusAssignRules(projectId: string) {
  const workspaceId = await getProjectWorkspaceId(projectId);
  const [rules, workspaceRules] = await Promise.all([
    selectStatusAssignRules(eq(statusAssignRuleTable.projectId, projectId)),
    selectStatusAssignRules(
      and(
        eq(statusAssignRuleTable.workspaceId, workspaceId),
        isNull(statusAssignRuleTable.projectId),
      ),
    ),
  ]);
  return { rules, workspaceRules };
}

export default getProjectStatusAssignRules;
