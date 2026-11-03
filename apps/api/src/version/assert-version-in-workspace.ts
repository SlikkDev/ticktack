import { and, eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../database";
import { versionTable } from "../database/schema";

type Database = Pick<typeof db, "select">;

/** Resolve a version the caller may attach to a task of this workspace. */
export async function assertVersionInWorkspace(
  versionId: string,
  workspaceId: string,
  database: Database = db,
) {
  const [version] = await database
    .select({ id: versionTable.id, name: versionTable.name })
    .from(versionTable)
    .where(
      and(
        eq(versionTable.id, versionId),
        eq(versionTable.workspaceId, workspaceId),
      ),
    )
    .limit(1);
  if (!version) {
    throw new HTTPException(404, {
      message: "Version not found in this workspace",
    });
  }
  return version;
}
