import { describe, expect, it } from "vite-plus/test";
import type { JiraIssue, JiraVersion } from "./api-types.js";
import {
  droppedVersionsWarning,
  issueVersionKey,
  mapVersions,
} from "./versions.js";

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

describe("mapVersions with the project's own list", () => {
  it("adds unused versions, skips archived unused ones and keeps archived ones in use", () => {
    expect(
      mapVersions(
        [issue("1", [{ id: "3", name: "old", archived: true }])],
        [
          { id: "1", name: "v0.0.63" },
          { id: "2", name: "batch", archived: true },
          { id: "3", name: "old", archived: true },
          { id: "4", name: " " },
        ],
      ).map((version) => version.key),
    ).toEqual(["3", "1"]);
  });
});

describe("issueVersionKey", () => {
  it("ignores fix versions without an id or a name", () => {
    expect(
      issueVersionKey(
        issue("1", [
          { id: "", name: "nameless" },
          { id: "10", name: " " },
          { id: "20", name: "2.0" },
        ]),
      ),
    ).toBe("20");
    expect(issueVersionKey(issue("2"))).toBeUndefined();
  });

  it("keeps the released version over an unreleased batch", () => {
    expect(
      issueVersionKey(
        issue("1", [
          { id: "10", name: "2026-10-21 Practitioner copy completion" },
          {
            id: "20",
            name: "v0.2.0",
            released: true,
            releaseDate: "2026-11-06",
          },
        ]),
      ),
    ).toBe("20");
    expect(
      issueVersionKey(
        issue("2", [
          {
            id: "20",
            name: "v0.2.0",
            released: true,
            releaseDate: "2026-11-06",
          },
          { id: "10", name: "next" },
        ]),
      ),
    ).toBe("20");
  });

  it("keeps the latest release, then the last one listed", () => {
    expect(
      issueVersionKey(
        issue("1", [
          {
            id: "69",
            name: "v0.0.69",
            released: true,
            releaseDate: "2026-11-02",
          },
          {
            id: "68",
            name: "v0.0.68",
            released: true,
            releaseDate: "2026-11-01",
          },
        ]),
      ),
    ).toBe("69");
    expect(
      issueVersionKey(
        issue("2", [
          { id: "68", name: "v0.0.68", released: true },
          { id: "69", name: "v0.0.69", released: true },
        ]),
      ),
    ).toBe("69");
  });
});

describe("droppedVersionsWarning", () => {
  it("names each issue with the version it keeps and the ones it drops", () => {
    expect(
      droppedVersionsWarning([issue("1", [{ id: "1", name: "1.0" }])]),
    ).toBeNull();
    expect(
      droppedVersionsWarning([
        issue("1", [
          { id: "10", name: "batch" },
          { id: "20", name: "v0.2.0", released: true },
        ]),
        issue("2", [{ id: "20", name: "v0.2.0", released: true }]),
      ]),
    ).toBe(
      "1 issue has several fix versions, and a task keeps one: the latest released (ABC-1 keeps v0.2.0, not batch).",
    );
  });
});
