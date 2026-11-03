import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { versionTable } from "../../database/schema";
import { publishEvent } from "../../events";

// task.version_id is ON DELETE SET NULL, so tasks simply leave the version.
async function deleteVersion(id: string, userId: string) {
  const [version] = await db
    .delete(versionTable)
    .where(eq(versionTable.id, id))
    .returning();

  if (!version) {
    throw new HTTPException(404, { message: "Version not found" });
  }

  await publishEvent("version.deleted", {
    workspaceId: version.workspaceId,
    versionId: version.id,
    userId,
  });

  return version;
}

export default deleteVersion;
