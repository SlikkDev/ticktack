import { describe, expect, it } from "vite-plus/test";
import { pickStatusAssignRule } from "./pick-status-assign-rule";

describe("pickStatusAssignRule", () => {
  const workspaceRule = { projectId: null, assigneeId: "ws-user" };
  const projectRule = { projectId: "p1", assigneeId: "board-user" };

  it("uses the workspace rule when the project has none", () => {
    expect(pickStatusAssignRule([workspaceRule], "p1")).toBe(workspaceRule);
  });

  it("lets the project rule override the workspace rule", () => {
    expect(pickStatusAssignRule([workspaceRule, projectRule], "p1")).toBe(
      projectRule,
    );
  });

  it("ignores rules of other projects", () => {
    expect(
      pickStatusAssignRule([{ projectId: "p2", assigneeId: "x" }], "p1"),
    ).toBeUndefined();
  });
});
