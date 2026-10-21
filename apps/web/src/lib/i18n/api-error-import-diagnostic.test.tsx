import english from "@i18n/en-US.json";
import hebrew from "@i18n/he-IL.json";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18n from "i18next";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { ImportDiagnostic } from "@/components/import/import-diagnostic";
import { getImportDiagnostic } from "./api-error-import-diagnostic";
import {
  importMessageKeys,
  importMessagePatterns,
} from "./api-error-import-patterns";

vi.mock("i18next", async (importOriginal) => {
  const { default: i18next } = await importOriginal<typeof import("i18next")>();
  return { default: i18next.createInstance() };
});
vi.mock("react-i18next", async () => {
  const { default: instance } = await import("i18next");
  return { useTranslation: () => ({ t: instance.t.bind(instance) }) };
});

beforeEach(async () => {
  await i18n.init({
    lng: "he-IL",
    fallbackLng: "en-US",
    resources: { "en-US": english, "he-IL": hebrew },
    interpolation: { escapeValue: false },
  });
});
afterEach(cleanup);

describe("import diagnostics", () => {
  it("has translations for every mapped message and pattern", () => {
    for (const key of [
      ...Object.values(importMessageKeys),
      ...importMessagePatterns.map((entry) => entry.key),
    ]) {
      for (const language of ["en-US", "he-IL"]) {
        expect(
          i18n.exists(key, { lng: language, fallbackLng: false }),
          `${language}: ${key}`,
        ).toBe(true);
      }
    }
  });

  it.each([
    ["Starting the import", "progress"],
    ["Reading comments (300 so far)", "progress"],
    ["Reading task links (8 of 12)", "progress"],
    ["Reading comments and task links (8 of 12)", "progress"],
    ["Reading comments (20 of 100 cards)", "progress"],
    ["Reading work items (22)", "progress"],
    ["Reading work items (22 of 100)", "progress"],
    ["The import was interrupted before it finished.", "error"],
    ["Kaneo is restarting. Start the import again in a minute.", "error"],
    ["PLANKA returned an error (HTTP 503). Try again later.", "error"],
    ["Could not reach PLANKA at planka.example.com:3000.", "error"],
    ["Linear is limiting requests. Try again in a few minutes.", "error"],
    ["Could not sign in to Jira. Check the API key.", "error"],
    [
      "1 task has an assignee whose email address could not be found, so the assignee may not carry over.",
      "warning",
    ],
    [
      "2 tasks have integration links (such as GitHub issues) that are not copied.",
      "warning",
    ],
    [
      "1 task references images or files stored on the source instance. They are not copied and may not display.",
      "warning",
    ],
    [
      "2 task links point to tasks in other projects and are not copied.",
      "warning",
    ],
    ["1 issue has attachments, which are not imported.", "warning"],
    [
      "2 parent or issue links point to other projects, so they were not imported.",
      "warning",
    ],
    [
      "1 card had more than one member. Kaneo keeps one assignee per task, so only the first member was assigned.",
      "warning",
    ],
    [
      "2 work items have more than one assignee. Kaneo keeps one assignee per task, so only the first was assigned.",
      "warning",
    ],
    [
      "Attachments on 2 cards, custom fields, Power-Up data, and stickers are not imported.",
      "warning",
    ],
    [
      "PLANKA hid the assignee email on 2 cards. Connect with a PLANKA admin account so assignees can be matched by email.",
      "warning",
    ],
    [
      "2 checklist items linked to cards on other boards and were not imported.",
      "warning",
    ],
    [
      "2 issues had more than 50 labels; only the first 50 were imported.",
      "warning",
    ],
    [
      "2 issues had more than 20 linked issues; only the first 20 links were imported.",
      "warning",
    ],
  ] as const)("translates generated import text: %s", (message, kind) => {
    const diagnostic = getImportDiagnostic(message, kind);
    expect(diagnostic.original).toBeUndefined();
    expect(diagnostic.message).toMatch(/[\u0590-\u05ff]/);
    expect(diagnostic.message).not.toBe(message);
    expect(diagnostic.message).not.toBe(hebrew.common.error.messages.unknown);
  });

  it("preserves and isolates project names and custom field names", () => {
    const progress = getImportDiagnostic(
      "Saving Project ABC / פרויקט",
      "progress",
      "Project ABC / פרויקט",
    );
    expect(progress.message).toBe("שמירת \u2068Project ABC / פרויקט\u2069");
    const warning = getImportDiagnostic(
      "Custom fields are not copied: Customer ID, שם לקוח.",
      "warning",
    );
    expect(warning.message).toContain("\u2068Customer ID, שם לקוח\u2069");
    expect(warning.original).toBeUndefined();
  });

  it("preserves the renamed column mapping and unmatched people", () => {
    const renamed = getImportDiagnostic(
      'Renamed 2 columns to avoid conflicts: "Done" to "Done list", "בדיקה" to "בדיקה 2".',
      "warning",
    );
    expect(renamed.original).toBeUndefined();
    expect(renamed.message).toContain(
      "\u2068Done\u2069 לשם \u2068Done list\u2069",
    );
    expect(renamed.message).toContain("בדיקה 2");
    const unmatched = getImportDiagnostic(
      "3 tasks were assigned to people who are not members of this workspace (Adam, Dana, and 2 more). Invite them, then assign the tasks.",
      "warning",
    );
    expect(unmatched.original).toBeUndefined();
    expect(unmatched.message).toContain("3");
    expect(unmatched.message).toContain("Adam, Dana, ועוד 2");
  });

  it("keeps upstream Kaneo as the import source and uses TickTack for local failures", () => {
    expect(
      getImportDiagnostic(
        "This Kaneo version does not expose comments, so they are not copied.",
        "warning",
      ).message,
    ).toContain("Kaneo");
    expect(
      getImportDiagnostic("Kaneo could not save this project.", "error")
        .message,
    ).toContain("טיקטק");
  });

  it("labels unknown original diagnostics in a closed accessible disclosure", () => {
    render(
      <ImportDiagnostic
        diagnostic={getImportDiagnostic(
          "Source field Customer ID requires manual review.",
          "warning",
        )}
      />,
    );
    expect(
      screen.getByText(hebrew.common.apiErrors.import.warningUnknown),
    ).toBeVisible();
    const summary = screen.getByText(
      hebrew.common.apiErrors.import.originalDetails,
    );
    expect(summary.tagName).toBe("SUMMARY");
    expect(summary.parentElement).not.toHaveAttribute("open");
    expect(
      screen.getByText("Source field Customer ID requires manual review."),
    ).not.toBeVisible();
    fireEvent.click(summary);
    expect(summary.parentElement).toHaveAttribute("open");
    expect(
      screen.getByText("Source field Customer ID requires manual review."),
    ).toHaveAttribute("dir", "auto");
  });

  it.each([
    "Database error: select password from users",
    "TypeError: unexpected\n    at internal.ts:12",
    "authorization: bearer-secret",
    "api_key=private-key-value",
  ])(
    "never exposes internals or credentials as original diagnostics: %s",
    (message) => {
      const result = getImportDiagnostic(message, "error");
      expect(result.original).toBeUndefined();
      expect(result.message).toBe(hebrew.common.error.messages.server);
    },
  );

  it("preserves English import diagnostics", async () => {
    await i18n.changeLanguage("en-US");
    expect(
      getImportDiagnostic("Reading comments (300 so far)", "progress"),
    ).toEqual({
      message: "Reading comments (300 so far)",
    });
  });
});
