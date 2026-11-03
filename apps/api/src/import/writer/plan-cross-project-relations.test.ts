import type { ImportedTaskRef } from "@kaneo/importers";
import { describe, expect, it } from "vite-plus/test";
import {
  planCrossProjectRelations,
  unresolvedCrossProjectWarning,
} from "./plan-cross-project-relations";

const tasks = new Map([
  ["ABC-1", "task-abc-1"],
  ["ABC-2", "task-abc-2"],
  ["OPS-9", "task-ops-9"],
]);
const resolve = (ref: ImportedTaskRef) =>
  tasks.get(`${ref.projectKey}-${ref.number}`);

describe("planCrossProjectRelations", () => {
  it("resolves both ends and keeps a link reported by both projects once", () => {
    expect(
      planCrossProjectRelations(
        [
          {
            source: { projectKey: "ABC", number: 1 },
            target: { projectKey: "OPS", number: 9 },
            type: "blocks",
          },
          {
            source: { projectKey: "ABC", number: 1 },
            target: { projectKey: "OPS", number: 9 },
            type: "blocks",
          },
          {
            source: { projectKey: "OPS", number: 9 },
            target: { projectKey: "ABC", number: 2 },
            type: "related",
          },
          {
            source: { projectKey: "ABC", number: 2 },
            target: { projectKey: "OPS", number: 9 },
            type: "related",
          },
        ],
        resolve,
      ),
    ).toEqual({
      planned: [
        {
          sourceTaskId: "task-abc-1",
          targetTaskId: "task-ops-9",
          relationType: "blocks",
        },
        {
          sourceTaskId: "task-ops-9",
          targetTaskId: "task-abc-2",
          relationType: "related",
        },
      ],
      unresolved: 0,
    });
  });

  it("counts links whose other project is missing", () => {
    expect(
      planCrossProjectRelations(
        [
          {
            source: { projectKey: "ABC", number: 1 },
            target: { projectKey: "GONE", number: 3 },
            type: "blocks",
          },
          {
            source: { projectKey: "ABC", number: 1 },
            target: { projectKey: "OPS", number: 404 },
            type: "subtask",
          },
        ],
        resolve,
      ),
    ).toEqual({ planned: [], unresolved: 2 });
  });
});

describe("unresolvedCrossProjectWarning", () => {
  it("reads in singular and plural", () => {
    expect(unresolvedCrossProjectWarning(1)).toMatch(/^1 link to a task/);
    expect(unresolvedCrossProjectWarning(3)).toMatch(/^3 links to tasks/);
  });
});
