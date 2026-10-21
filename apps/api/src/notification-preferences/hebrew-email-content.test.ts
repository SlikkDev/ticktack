import { describe, expect, it } from "vite-plus/test";
import { hebrewEmailContent } from "./hebrew-email-content";

const fallback = { title: "English title", body: "English body" };
const notification = (
  type: string,
  eventData: Record<string, unknown> = {},
) => ({ type, title: null, content: null, eventData });

describe("Hebrew generated notification copy", () => {
  it.each([
    "task_created",
    "workspace_created",
    "task_status_changed",
    "task_assignee_changed",
    "time_entry_created",
    "due_date_reminder",
    "task_overdue",
    "task_mention",
    "task_comment",
  ])("localizes %s including absent metadata", (type) => {
    const content = hebrewEmailContent(notification(type), fallback);
    expect(content.title).toMatch(/[א-ת]/);
    expect(content.body).toMatch(/[א-ת]/);
  });

  it("preserves a mixed title and translates default statuses", () => {
    const content = hebrewEmailContent(
      notification("task_status_changed", {
        taskTitle: "בדיקת API-123",
        oldStatus: "to-do",
        newStatus: "done",
      }),
      fallback,
    );
    expect(content.body).toContain("\u2068בדיקת API-123\u2069");
    expect(content.body).toContain("לביצוע");
    expect(content.body).toContain("הושלם");
  });

  it.each([
    [1, "בעוד דקה"],
    [2, "בעוד שתי דקות"],
    [60, "בעוד שעה"],
    [120, "בעוד שעתיים"],
    [1440, "בעוד יום"],
    [2880, "בעוד יומיים"],
    [4320, "בעוד 3 ימים"],
  ])("formats a %d-minute reminder", (leadTimeMinutes, expected) => {
    expect(
      hebrewEmailContent(
        notification("due_date_reminder", { leadTimeMinutes }),
        fallback,
      ).body,
    ).toContain(expected);
  });

  it("does not replace custom notification content", () => {
    const content = hebrewEmailContent(
      {
        type: "custom",
        title: "Custom title",
        content: "Custom body",
        eventData: null,
      },
      fallback,
    );
    expect(content).toEqual({ title: "Custom title", body: "Custom body" });
  });
});
