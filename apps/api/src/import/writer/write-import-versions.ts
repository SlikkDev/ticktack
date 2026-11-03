import type { ImportedVersion } from "@kaneo/importers";
import { and, eq, inArray } from "drizzle-orm";
import type db from "../../database";
import { versionTable } from "../../database/schema";
import { VERSION_NAME_MAX } from "../../version/schema";
import { chunk } from "./chunk";
import { parseImportDate } from "./plan-import-tasks";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Create the source's versions in the workspace, reusing any that already
 * exist by name (another project of the same import, or an earlier run).
 * Returns the Kaneo version id for each source version key.
 */
export async function writeImportVersions(
  tx: Transaction,
  workspaceId: string,
  versions: readonly ImportedVersion[],
): Promise<Map<string, string>> {
  const byName = new Map<string, ImportedVersion>();
  const nameByKey = new Map<string, string>();
  for (const version of versions) {
    const name = version.name.trim().slice(0, VERSION_NAME_MAX);
    if (!name) continue;
    nameByKey.set(version.key, name);
    if (!byName.has(name)) byName.set(name, version);
  }

  const names = [...byName.keys()];
  if (names.length === 0) return new Map();

  for (const batch of chunk(names)) {
    await tx
      .insert(versionTable)
      .values(
        batch.map((name) => {
          const version = byName.get(name) as ImportedVersion;
          return {
            workspaceId,
            name,
            description: version.description?.trim() || null,
            releasedAt: parseImportDate(version.releasedAt),
          };
        }),
      )
      .onConflictDoNothing({
        target: [versionTable.workspaceId, versionTable.name],
      });
  }

  const idByName = new Map<string, string>();
  for (const batch of chunk(names)) {
    const rows = await tx
      .select({ id: versionTable.id, name: versionTable.name })
      .from(versionTable)
      .where(
        and(
          eq(versionTable.workspaceId, workspaceId),
          inArray(versionTable.name, batch),
        ),
      );
    for (const row of rows) idByName.set(row.name, row.id);
  }

  const idByKey = new Map<string, string>();
  for (const [key, name] of nameByKey) {
    const id = idByName.get(name);
    if (id) idByKey.set(key, id);
  }
  return idByKey;
}
