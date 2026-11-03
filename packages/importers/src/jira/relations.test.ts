import { describe, expect, it } from "vite-plus/test";
import type { JiraIssue, JiraIssueLink } from "./api-types.js";
import { isBlocksLink, mapRelations, parseIssueKey } from "./relations.js";

const BLOCKS = { name: "Blocks", inward: "is blocked by", outward: "blocks" };
const RELATES = {
  name: "Relates",
  inward: "relates to",
  outward: "relates to",
};
const DUPLICATE = {
  name: "Duplicate",
  inward: "is duplicated by",
  outward: "duplicates",
};

function issue(
  id: string,
  links: JiraIssueLink[] = [],
  parent?: string,
): JiraIssue {
  return {
    id,
    key: `ABC-${id}`,
    fields: {
      issuelinks: links,
      ...(parent ? { parent: { id: parent } } : {}),
    },
  };
}

describe("mapRelations", () => {
  it("maps parents to subtasks inside the project", () => {
    const result = mapRelations([issue("1"), issue("2", [], "1")]);
    expect(result).toEqual({
      relations: [{ sourceKey: "1", targetKey: "2", type: "subtask" }],
      crossProject: [],
      external: 0,
    });
  });

  it("keeps the blocking direction from both sides and adds it once", () => {
    const result = mapRelations([
      issue("1", [{ type: BLOCKS, outwardIssue: { id: "2" } }]),
      issue("2", [{ type: BLOCKS, inwardIssue: { id: "1" } }]),
      issue("3", [{ type: BLOCKS, inwardIssue: { id: "2" } }]),
    ]);
    expect(result.relations).toEqual([
      { sourceKey: "1", targetKey: "2", type: "blocks" },
      { sourceKey: "2", targetKey: "3", type: "blocks" },
    ]);
  });

  it("turns every other link type into one related link per pair", () => {
    const result = mapRelations([
      issue("1", [
        { type: RELATES, outwardIssue: { id: "2" } },
        { type: DUPLICATE, inwardIssue: { id: "3" } },
      ]),
      issue("2", [{ type: RELATES, inwardIssue: { id: "1" } }]),
      issue("3", [
        { type: DUPLICATE, outwardIssue: { id: "1" } },
        { type: { name: "Cloners" }, outwardIssue: { id: "2" } },
      ]),
    ]);
    expect(result.relations).toEqual([
      { sourceKey: "1", targetKey: "2", type: "related" },
      { sourceKey: "3", targetKey: "1", type: "related" },
      { sourceKey: "3", targetKey: "2", type: "related" },
    ]);
  });

  it("drops and counts parents and links that point outside the project", () => {
    const result = mapRelations([
      issue(
        "1",
        [
          { type: BLOCKS, outwardIssue: { id: "99" } },
          { type: RELATES, inwardIssue: { id: "98" } },
          { type: RELATES, outwardIssue: { id: "98" } },
        ],
        "97",
      ),
      issue("2", [{ type: BLOCKS, outwardIssue: { id: "99" } }]),
      issue("3", [{ type: RELATES, outwardIssue: { id: "3" } }]),
    ]);
    expect(result).toEqual({ relations: [], crossProject: [], external: 4 });
  });

  it("keeps links to other projects by issue key, once per link", () => {
    const result = mapRelations([
      issue(
        "1",
        [
          { type: BLOCKS, outwardIssue: { id: "99", key: "OPS-9" } },
          { type: BLOCKS, inwardIssue: { id: "98", key: "OPS-8" } },
          { type: RELATES, outwardIssue: { id: "97", key: "OPS-7" } },
          { type: RELATES, inwardIssue: { id: "97", key: "OPS-7" } },
          { type: RELATES, outwardIssue: { id: "96", key: "not-a-key" } },
          { type: RELATES, outwardIssue: { id: "95", key: "ABC-95" } },
        ],
        "94",
      ),
      issue("2", [{ type: BLOCKS, outwardIssue: { id: "99", key: "OPS-9" } }]),
    ]);
    expect(result.relations).toEqual([]);
    expect(result.crossProject).toEqual([
      {
        source: { projectKey: "ABC", number: 1 },
        target: { projectKey: "OPS", number: 9 },
        type: "blocks",
      },
      {
        source: { projectKey: "OPS", number: 8 },
        target: { projectKey: "ABC", number: 1 },
        type: "blocks",
      },
      {
        source: { projectKey: "ABC", number: 1 },
        target: { projectKey: "OPS", number: 7 },
        type: "related",
      },
      {
        source: { projectKey: "ABC", number: 2 },
        target: { projectKey: "OPS", number: 9 },
        type: "blocks",
      },
    ]);
    // The unparsable key, the same-project unknown issue and the keyless parent.
    expect(result.external).toBe(3);
  });

  it("keeps a parent in another project as a cross-project subtask", () => {
    const result = mapRelations([
      {
        id: "1",
        key: "ABC-1",
        fields: { parent: { id: "50", key: "EPIC-5" } },
      },
    ]);
    expect(result.crossProject).toEqual([
      {
        source: { projectKey: "EPIC", number: 5 },
        target: { projectKey: "ABC", number: 1 },
        type: "subtask",
      },
    ]);
    expect(result.external).toBe(0);
  });
});

describe("parseIssueKey", () => {
  it("splits an issue key into project key and number", () => {
    expect(parseIssueKey("OPS-9")).toEqual({ projectKey: "OPS", number: 9 });
    expect(parseIssueKey(" my-app-12 ")).toEqual({
      projectKey: "my-app",
      number: 12,
    });
    expect(parseIssueKey("OPS-0")).toBeUndefined();
    expect(parseIssueKey("OPS")).toBeUndefined();
    expect(parseIssueKey(null)).toBeUndefined();
  });
});

describe("isBlocksLink", () => {
  it("recognizes renamed blocks links by their outward wording", () => {
    expect(isBlocksLink({ type: BLOCKS })).toBe(true);
    expect(
      isBlocksLink({ type: { name: "Dependency", outward: "Blocks" } }),
    ).toBe(true);
    expect(isBlocksLink({ type: RELATES })).toBe(false);
    expect(isBlocksLink({})).toBe(false);
  });
});
