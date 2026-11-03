import type {
  ImportedCrossProjectRelation,
  ImportedTaskRef,
} from "@kaneo/importers";
import { and, eq, inArray } from "drizzle-orm";
import db from "../../database";
import {
  projectTable,
  taskRelationTable,
  taskTable,
} from "../../database/schema";
import { isSameProjectKey } from "../../project/project-key";
import { chunk } from "./chunk";
import {
  type CrossProjectRelationPlan,
  planCrossProjectRelations,
} from "./plan-cross-project-relations";
import type { PlannedImportRelation } from "./plan-import-relations";

export type WriteCrossProjectRelationsInput = {
  workspaceId: string;
  relations: readonly ImportedCrossProjectRelation[];
  /** Kaneo project key for each source project key imported in this run. */
  projectKeys: ReadonlyMap<string, string>;
};

function refId(ref: ImportedTaskRef): string {
  return `${ref.projectKey.toUpperCase()}-${ref.number}`;
}

async function lookupTasks(
  workspaceId: string,
  refs: ImportedTaskRef[],
  projectKeys: ReadonlyMap<string, string>,
): Promise<Map<string, string>> {
  const projects = await db
    .select({ id: projectTable.id, slug: projectTable.slug })
    .from(projectTable)
    .where(eq(projectTable.workspaceId, workspaceId));

  // A source project may have been written under another key when its own was
  // taken; the run remembers which. Projects from earlier runs keep their key.
  const projectIdByKey = new Map<string, string>();
  for (const ref of refs) {
    const upper = ref.projectKey.toUpperCase();
    if (projectIdByKey.has(upper)) continue;
    const wanted = projectKeys.get(ref.projectKey) ?? ref.projectKey;
    const project = projects.find((candidate) =>
      isSameProjectKey(candidate.slug, wanted),
    );
    if (project) projectIdByKey.set(upper, project.id);
  }

  const taskIdByRef = new Map<string, string>();
  const projectIds = [...new Set(projectIdByKey.values())];
  const numbers = [...new Set(refs.map((ref) => ref.number))];
  if (projectIds.length === 0 || numbers.length === 0) return taskIdByRef;

  const keyByProjectId = new Map(
    [...projectIdByKey].map(([key, id]) => [id, key]),
  );
  for (const batch of chunk(numbers)) {
    const rows = await db
      .select({
        id: taskTable.id,
        projectId: taskTable.projectId,
        number: taskTable.number,
      })
      .from(taskTable)
      .where(
        and(
          inArray(taskTable.projectId, projectIds),
          inArray(taskTable.number, batch),
        ),
      );
    for (const row of rows) {
      const key = keyByProjectId.get(row.projectId);
      if (key && row.number !== null)
        taskIdByRef.set(`${key}-${row.number}`, row.id);
    }
  }
  return taskIdByRef;
}

async function withoutExisting(
  planned: readonly PlannedImportRelation[],
): Promise<PlannedImportRelation[]> {
  if (planned.length === 0) return [];
  const sourceIds = [...new Set(planned.map((row) => row.sourceTaskId))];
  const existing = new Set<string>();
  for (const batch of chunk(sourceIds)) {
    const rows = await db
      .select({
        sourceTaskId: taskRelationTable.sourceTaskId,
        targetTaskId: taskRelationTable.targetTaskId,
        relationType: taskRelationTable.relationType,
      })
      .from(taskRelationTable)
      .where(inArray(taskRelationTable.sourceTaskId, batch));
    for (const row of rows)
      existing.add(
        `${row.relationType}:${row.sourceTaskId}:${row.targetTaskId}`,
      );
  }
  return planned.filter(
    (row) =>
      !existing.has(
        `${row.relationType}:${row.sourceTaskId}:${row.targetTaskId}`,
      ),
  );
}

/**
 * Link tasks across the projects of a workspace once every project of the
 * import run is written. Runs outside the per-project transactions: a failure
 * here loses links, never projects.
 */
export async function writeCrossProjectRelations({
  workspaceId,
  relations,
  projectKeys,
}: WriteCrossProjectRelationsInput): Promise<
  CrossProjectRelationPlan & { written: number }
> {
  const refs = relations.flatMap((relation) => [
    relation.source,
    relation.target,
  ]);
  const taskIdByRef = await lookupTasks(workspaceId, refs, projectKeys);
  const plan = planCrossProjectRelations(relations, (ref) =>
    taskIdByRef.get(refId(ref)),
  );
  const rows = await withoutExisting(plan.planned);
  for (const batch of chunk(rows)) {
    await db.insert(taskRelationTable).values(batch);
  }
  return { ...plan, written: rows.length };
}
