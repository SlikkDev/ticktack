import type {
  ImportedCrossProjectRelation,
  ImportedTaskRef,
} from "@kaneo/importers";
import type { PlannedImportRelation } from "./plan-import-relations";

export type CrossProjectRelationPlan = {
  planned: PlannedImportRelation[];
  /** Relations with an end that is not in the workspace. */
  unresolved: number;
};

/**
 * Turn cross-project relations into task id pairs. `resolve` answers with the
 * task that a source reference names in the workspace, or undefined when that
 * project or task was not imported. Both projects report a shared link, so the
 * same pair is kept once.
 */
export function planCrossProjectRelations(
  relations: readonly ImportedCrossProjectRelation[],
  resolve: (ref: ImportedTaskRef) => string | undefined,
): CrossProjectRelationPlan {
  const seen = new Set<string>();
  const planned: PlannedImportRelation[] = [];
  let unresolved = 0;

  for (const relation of relations) {
    const sourceTaskId = resolve(relation.source);
    const targetTaskId = resolve(relation.target);
    if (!sourceTaskId || !targetTaskId) {
      unresolved += 1;
      continue;
    }
    if (sourceTaskId === targetTaskId) continue;

    const pair =
      relation.type === "related"
        ? [sourceTaskId, targetTaskId].sort().join(":")
        : `${sourceTaskId}:${targetTaskId}`;
    const identity = `${relation.type}:${pair}`;
    if (seen.has(identity)) continue;
    seen.add(identity);

    planned.push({ sourceTaskId, targetTaskId, relationType: relation.type });
  }

  return { planned, unresolved };
}

export function unresolvedCrossProjectWarning(count: number): string {
  return count === 1
    ? "1 link to a task in another project was not imported because that project is not in this workspace. Import it too to keep the link."
    : `${count} links to tasks in other projects were not imported because those projects are not in this workspace. Import them too to keep the links.`;
}
