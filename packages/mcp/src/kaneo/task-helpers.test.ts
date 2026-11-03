import { describe, expect, it } from "vite-plus/test";
import { buildFullTaskUpdateBody } from "./task-helpers.js";

describe("buildFullTaskUpdateBody", () => {
  it("merges patch onto existing task", () => {
    // Arrange
    const original = {
      title: "T",
      description: "D",
      status: "open",
      priority: "low",
      projectId: "p1",
      position: 1,
      userId: "u1",
    };
    const patch = { status: "done" as const };

    // Act
    const body = buildFullTaskUpdateBody(original, patch);

    // Assert
    expect(body.status).toBe("done");
    expect(body.title).toBe("T");
    expect(body.position).toBe(1);
    expect("versionId" in body).toBe(false);
  });

  it("sends the version only when it is patched", () => {
    const original = {
      title: "T",
      description: "D",
      status: "open",
      priority: "low",
      projectId: "p1",
      position: 1,
      versionId: "v-old",
    };

    expect(
      buildFullTaskUpdateBody(original, { versionId: "v-new" }).versionId,
    ).toBe("v-new");
    expect(
      buildFullTaskUpdateBody(original, { versionId: null }).versionId,
    ).toBe(null);
    expect("versionId" in buildFullTaskUpdateBody(original, {})).toBe(false);
  });
});
