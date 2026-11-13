import { asc, eq } from "drizzle-orm";
import db from "../../database";
import { columnTable, projectTable } from "../../database/schema";

// Statuses across every project of the workspace, first name wins per slug.
export async function listWorkspaceStatuses(workspaceId: string) {
  const columns = await db
    .select({ slug: columnTable.slug, name: columnTable.name })
    .from(columnTable)
    .innerJoin(projectTable, eq(columnTable.projectId, projectTable.id))
    .where(eq(projectTable.workspaceId, workspaceId))
    .orderBy(asc(columnTable.position), asc(columnTable.createdAt));

  const bySlug = new Map<string, { slug: string; name: string }>();
  for (const column of columns)
    if (!bySlug.has(column.slug)) bySlug.set(column.slug, column);
  return [...bySlug.values()];
}
