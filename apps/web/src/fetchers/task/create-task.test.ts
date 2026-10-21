import english from "@i18n/en-US.json";
import hebrew from "@i18n/he-IL.json";
import i18n from "i18next";
import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import createTask from "./create-task";

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
}));

vi.mock("@kaneo/libs", () => ({
  client: {
    task: {
      ":projectId": {
        $post: mocks.post,
      },
    },
  },
}));
vi.mock("i18next", async (importOriginal) => {
  const { default: i18next } = await importOriginal<typeof import("i18next")>();
  return { default: i18next.createInstance() };
});

describe("createTask", () => {
  beforeEach(async () => {
    await i18n.init({
      lng: "he-IL",
      resources: { "en-US": english, "he-IL": hebrew },
    });
    mocks.post.mockReset();
    mocks.post.mockResolvedValue({
      ok: true,
      json: async () => ({ id: "task-1" }),
    });
  });

  it.each([
    ["he-IL", hebrew.common.modals.createTask.selectProject],
    ["en-US", "No project selected for task creation"],
  ])(
    "presents missing-project guidance in %s without sending a request",
    async (locale, message) => {
      await i18n.changeLanguage(locale);
      await expect(
        createTask(
          "Task",
          "",
          "",
          undefined,
          "to-do",
          undefined,
          undefined,
          "no-priority",
        ),
      ).rejects.toMatchObject({
        name: "ApiClientError",
        message,
        originalMessage: "No project selected for task creation",
        status: undefined,
        code: undefined,
      });
      expect(mocks.post).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, ""])(
    "omits the assignee when userId is %s",
    async (userId) => {
      await createTask(
        "Unassigned task",
        "",
        "project-1",
        userId,
        "to-do",
        undefined,
        undefined,
        "no-priority",
      );

      expect(mocks.post).toHaveBeenCalledWith({
        json: {
          title: "Unassigned task",
          description: "",
          status: "to-do",
          startDate: undefined,
          dueDate: undefined,
          priority: "no-priority",
        },
        param: { projectId: "project-1" },
      });
    },
  );

  it("preserves an assigned userId", async () => {
    await createTask(
      "Assigned task",
      "",
      "project-1",
      "user-1",
      "to-do",
      undefined,
      undefined,
      "no-priority",
    );

    expect(mocks.post).toHaveBeenCalledWith(
      expect.objectContaining({
        json: expect.objectContaining({ userId: "user-1" }),
      }),
    );
  });
});
