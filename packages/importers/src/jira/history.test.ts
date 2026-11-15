import { describe, expect, it } from "vite-plus/test";
import type { JiraIssue } from "./api-types.js";
import { historyTruncated, mapHistory } from "./history.js";

function issue(changelog: JiraIssue["changelog"]): JiraIssue {
  return { id: "1", key: "TECH-9", changelog };
}

describe("mapHistory", () => {
  it("keeps status, assignee and fix version changes with their author and time", () => {
    expect(
      mapHistory(
        issue({
          histories: [
            {
              author: { displayName: "Eitan Yariv" },
              created: "2026-11-06T11:27:00.000+0000",
              items: [
                {
                  field: "status",
                  fromString: "In Review",
                  toString: "Approved",
                },
                { field: "description", fromString: "a", toString: "b" },
              ],
            },
            {
              author: null,
              created: "2026-11-06T12:00:00.000+0000",
              items: [
                { field: "Fix Version", fromString: null, toString: "v0.2.0" },
                { field: "assignee", fromString: "Dina", toString: "Dina" },
              ],
            },
            { items: [{ field: "summary", toString: "New title" }] },
          ],
        }),
      ),
    ).toEqual([
      {
        author: { name: "Eitan Yariv" },
        body: 'Changed status from "In Review" to "Approved" in Jira.',
        createdAt: "2026-11-06T11:27:00.000Z",
      },
      {
        author: { name: "Jira user" },
        body: 'Changed fix version from "(none)" to "v0.2.0" in Jira.',
        createdAt: "2026-11-06T12:00:00.000Z",
      },
    ]);
    expect(mapHistory(issue(null))).toEqual([]);
  });

  it("notices when Jira returned only part of the history", () => {
    expect(historyTruncated(issue({ histories: [{}], total: 1 }))).toBe(false);
    expect(historyTruncated(issue({ histories: [{}], total: 120 }))).toBe(true);
    expect(historyTruncated(issue(undefined))).toBe(false);
  });
});
