import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { versionTable } from "../../database/schema";
import { publishEvent } from "../../events";

export const VERSION_NAME_TAKEN = "A version with this name already exists";

async function createVersion({
  workspaceId,
  name,
  description,
  userId,
}: {
  workspaceId: string;
  name: string;
  description?: string | null;
  userId: string;
}) {
  const [version] = await db
    .insert(versionTable)
    .values({ workspaceId, name, description: description || null })
    .onConflictDoNothing({
      target: [versionTable.workspaceId, versionTable.name],
    })
    .returning();

  if (!version) {
    throw new HTTPException(409, { message: VERSION_NAME_TAKEN });
  }

  await publishEvent("version.created", {
    workspaceId,
    versionId: version.id,
    userId,
  });

  return version;
}

export default createVersion;
