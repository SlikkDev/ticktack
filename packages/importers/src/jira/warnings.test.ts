import { describe, expect, it } from "vite-plus/test";
import { BOARD_UNAVAILABLE_WARNING, buildWarnings } from "./warnings.js";

describe("buildWarnings", () => {
  it("stays quiet when nothing was dropped", () => {
    expect(
      buildWarnings({
        issuesWithAttachments: [],
        externalLinks: 0,
        boardUnavailable: false,
      }),
    ).toEqual([]);
  });

  it("counts attachments and outside links in singular and plural", () => {
    expect(
      buildWarnings({
        issuesWithAttachments: ["ABC-1"],
        externalLinks: 1,
        boardUnavailable: false,
      }),
    ).toEqual([
      "1 issue has attachments, which are not imported: ABC-1.",
      "1 parent or issue link points to an issue Kaneo could not identify, so it was not imported.",
    ]);
    expect(
      buildWarnings({
        issuesWithAttachments: ["ABC-1", "ABC-2", "ABC-3"],
        externalLinks: 2,
        boardUnavailable: true,
      }),
    ).toEqual([
      "3 issues have attachments, which are not imported: ABC-1, ABC-2, ABC-3.",
      "2 parent or issue links point to issues Kaneo could not identify, so they were not imported.",
      BOARD_UNAVAILABLE_WARNING,
    ]);
  });

  it("names the statuses Jira files under Done when more than one is final", () => {
    expect(
      buildWarnings({
        issuesWithAttachments: [],
        externalLinks: 0,
        boardUnavailable: false,
        finalColumns: ["Done"],
      }),
    ).toEqual([]);
    expect(
      buildWarnings({
        issuesWithAttachments: [],
        externalLinks: 0,
        boardUnavailable: false,
        finalColumns: ["Done", "In Progress"],
      }),
    ).toEqual([
      'Jira files 2 statuses under Done, so these columns count tasks as finished: Done, In Progress. Check each in the project\'s columns, and turn off "final" for any that is still work in progress.',
    ]);
  });

  it("lists at most ten issue keys and reports partial histories", () => {
    const keys = Array.from({ length: 12 }, (_, index) => `ABC-${index + 1}`);
    expect(
      buildWarnings({
        issuesWithAttachments: keys,
        externalLinks: 0,
        boardUnavailable: false,
        truncatedHistories: 2,
        droppedVersions: "Versions dropped.",
      }),
    ).toEqual([
      "12 issues have attachments, which are not imported: ABC-1, ABC-2, ABC-3, ABC-4, ABC-5, ABC-6, ABC-7, ABC-8, ABC-9, ABC-10, and 2 more.",
      "2 issues have a longer change history than Jira returns at once, so only their latest changes were imported.",
      "Versions dropped.",
    ]);
  });
});
