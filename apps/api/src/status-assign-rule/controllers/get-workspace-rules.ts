import { and, eq, isNull } from "drizzle-orm";
import { statusAssignRuleTable } from "../../database/schema";
import { listWorkspaceStatuses } from "./list-workspace-statuses";
import { selectStatusAssignRules } from "./select-rules";

async function getWorkspaceStatusAssignRules(workspaceId: string) {
  const [rules, statuses] = await Promise.all([
    selectStatusAssignRules(
      and(
        eq(statusAssignRuleTable.workspaceId, workspaceId),
        isNull(statusAssignRuleTable.projectId),
      ),
    ),
    listWorkspaceStatuses(workspaceId),
  ]);
  return { rules, statuses };
}

export default getWorkspaceStatusAssignRules;
