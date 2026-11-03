import { describe, expect, it } from "vite-plus/test";
import type { JiraIssue, JiraVersion } from "./api-types.js";
import { issueVersionKey, mapVersions } from "./versions.js";

function issue(id: string, fixVersions?: JiraVersion[]): JiraIssue {
  return { id, key: `ABC-${id}`, fields: { fixVersions } };
}

describe("mapVersions", () => {
  it("collects each fix version once, sorted by name, with its release date", () => {
    expect(
      mapVersions([
        issue("1", [
          { id: "20", name: " 2.0 ", description: " Big one " },
          {
            id: "10",
            name: "1.0",
            released: true,
            releaseDate: "2024-03-01",
          },
        ]),
        issue("2", [{ id: "20", name: "2.0" }]),
        issue("3", [
          { id: "30", name: "  " },
          { id: "", name: "ghost" },
        ]),
        issue("4"),
      ]),
    ).toEqual([
      {
        key: "10",
        name: "1.0",
        releasedAt: "2024-03-01T00:00:00.000Z",
      },
      { key: "20", name: "2.0", description: "Big one" },
    ]);
  });

  it("marks a released version without a date as released long ago", () => {
    expect(
      mapVersions([issue("1", [{ id: "10", name: "1.0", released: true }])]),
    ).toEqual([
      { key: "10", name: "1.0", releasedAt: "1970-01-01T00:00:00.000Z" },
    ]);
  });
});

describe("issueVersionKey", () => {
  it("keeps the first named fix version", () => {
    expect(
      issueVersionKey(
        issue("1", [
          { id: "", name: "nameless" },
          { id: "10", name: " " },
          { id: "20", name: "2.0" },
          { id: "30", name: "3.0" },
        ]),
      ),
    ).toBe("20");
    expect(issueVersionKey(issue("2"))).toBeUndefined();
  });
});
