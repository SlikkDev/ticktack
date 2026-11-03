import {
  and,
  desc,
  eq,
  getTableColumns,
  isNotNull,
  isNull,
  sql,
} from "drizzle-orm";
import db from "../../database";
import { taskTable, versionTable } from "../../database/schema";

async function listVersions(
  workspaceId: string,
  options: { released?: boolean } = {},
) {
  const releasedFilter =
    options.released === undefined
      ? undefined
      : options.released
        ? isNotNull(versionTable.releasedAt)
        : isNull(versionTable.releasedAt);

  return (
    db
      .select({
        ...getTableColumns(versionTable),
        taskCount: sql<number>`count(${taskTable.id})::int`,
      })
      .from(versionTable)
      .leftJoin(taskTable, eq(taskTable.versionId, versionTable.id))
      .where(and(eq(versionTable.workspaceId, workspaceId), releasedFilter))
      .groupBy(versionTable.id)
      // Open versions first, newest first within each group.
      .orderBy(
        sql`${versionTable.releasedAt} is not null`,
        desc(versionTable.createdAt),
        desc(versionTable.id),
      )
  );
}

export default listVersions;
