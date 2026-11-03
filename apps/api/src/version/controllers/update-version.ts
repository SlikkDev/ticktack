import { eq } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { versionTable } from "../../database/schema";
import { publishEvent } from "../../events";
import { isUniqueViolation } from "../unique-violation";
import { VERSION_NAME_TAKEN } from "./create-version";

async function updateVersion({
  id,
  name,
  description,
  released,
  userId,
}: {
  id: string;
  name?: string;
  description?: string | null;
  released?: boolean;
  userId: string;
}) {
  const changes: Partial<typeof versionTable.$inferInsert> = {};
  if (name !== undefined) changes.name = name;
  if (description !== undefined) changes.description = description || null;

  const version = await db.transaction(async (tx) => {
    const [current] = await tx
      .select({ id: versionTable.id, releasedAt: versionTable.releasedAt })
      .from(versionTable)
      .where(eq(versionTable.id, id))
      .for("update");
    if (!current) {
      throw new HTTPException(404, { message: "Version not found" });
    }

    // Releasing twice keeps the first release date.
    if (released === true && !current.releasedAt) {
      changes.releasedAt = new Date();
    } else if (released === false && current.releasedAt) {
      changes.releasedAt = null;
    }

    if (Object.keys(changes).length === 0) {
      const [unchanged] = await tx
        .select()
        .from(versionTable)
        .where(eq(versionTable.id, id));
      return unchanged;
    }

    try {
      const [updated] = await tx
        .update(versionTable)
        .set(changes)
        .where(eq(versionTable.id, id))
        .returning();
      return updated;
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new HTTPException(409, { message: VERSION_NAME_TAKEN });
      }
      throw error;
    }
  });

  if (!version) {
    throw new HTTPException(404, { message: "Version not found" });
  }

  await publishEvent("version.updated", {
    workspaceId: version.workspaceId,
    versionId: version.id,
    userId,
  });

  return version;
}

export default updateVersion;
