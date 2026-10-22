import { beforeEach, describe, expect, it, vi } from "vite-plus/test";
import type { WatchSummary } from "@/fetchers/watch/get-watch-summary";

const m = vi.hoisted(() => ({
  workspaceId: "ws-1" as string | null,
  summary: null as unknown,
  createTimeEntry: vi.fn(async (_input: unknown) => ({})),
  updateTimeEntry: vi.fn(async (_input: unknown) => ({})),
}));

vi.mock("@/lib/assistant/resolve-active-workspace", () => ({
  resolveActiveWorkspaceId: async () => m.workspaceId,
}));
vi.mock("@/fetchers/watch/get-watch-summary", () => ({
  default: async () => m.summary,
}));
vi.mock("@/fetchers/time-entry/create-time-entry", () => ({
  default: (input: unknown) => m.createTimeEntry(input),
}));
vi.mock("@/fetchers/time-entry/update-time-entry", () => ({
  default: (input: unknown) => m.updateTimeEntry(input),
}));

import { runAssistantAction } from "./run-assistant-action";

const now = () => new Date("2026-10-22T10:30:00.000Z");

function summary(overrides: Partial<WatchSummary> = {}): WatchSummary {
  return {
    user: { id: "u-1", name: "Dana" },
    projects: [
      {
        id: "p-web",
        name: "Website",
        slug: "WEB",
        workspaceId: "ws-2",
        workspaceName: "Beta",
        statuses: [],
      },
    ],
    tasks: [
      {
        id: "t-1",
        projectId: "p-web",
        number: 12,
        title: "Fix the login bug",
        status: "to-do",
        statusName: "To Do",
        priority: "high",
        dueDate: null,
      },
      {
        id: "t-2",
        projectId: "p-web",
        number: 13,
        title: "Login page redesign",
        status: "to-do",
        statusName: "To Do",
        priority: "low",
        dueDate: null,
      },
    ],
    total: 2,
    runningTimer: null,
    unreadNotifications: 0,
    ...overrides,
  };
}

const running = {
  id: "te-1",
  taskId: "t-2",
  taskTitle: "Login page redesign",
  projectId: "p-web",
  projectName: "Website",
  workspaceId: "ws-2",
  startTime: "2026-10-22T09:15:30.000Z",
};

beforeEach(() => {
  m.workspaceId = "ws-1";
  m.summary = summary();
  m.createTimeEntry.mockClear();
  m.updateTimeEntry.mockClear();
});

describe("runAssistantAction", () => {
  it("sends a user without a workspace to the dashboard", async () => {
    m.workspaceId = null;
    expect(await runAssistantAction("whats-next", {}, now)).toEqual({
      kind: "dashboard",
    });
  });

  it("maps navigation actions onto existing pages", async () => {
    expect(await runAssistantAction("whats-next", {}, now)).toEqual({
      kind: "my-tasks",
      workspaceId: "ws-1",
    });
    expect(await runAssistantAction("open", { feature: "inbox" }, now)).toEqual(
      { kind: "inbox", workspaceId: "ws-1" },
    );
    expect(
      await runAssistantAction("open", { feature: "new_task" }, now),
    ).toEqual({ kind: "create-task" });
    expect(
      await runAssistantAction("open", { feature: "unknown" }, now),
    ).toEqual({ kind: "home", workspaceId: "ws-1" });
    expect(
      await runAssistantAction("search", { q: " invoices " }, now),
    ).toEqual({ kind: "search", workspaceId: "ws-1", query: "invoices" });
    expect(await runAssistantAction("search", { q: " " }, now)).toEqual({
      kind: "home",
      workspaceId: "ws-1",
    });
    expect(await runAssistantAction("nonsense", {}, now)).toEqual({
      kind: "home",
      workspaceId: "ws-1",
    });
  });

  it("opens the create task form with the spoken title", async () => {
    expect(
      await runAssistantAction(
        "create-task",
        { title: " Call the plumber " },
        now,
      ),
    ).toEqual({ kind: "create-task", title: "Call the plumber" });
    expect(await runAssistantAction("create-task", { title: "" }, now)).toEqual(
      { kind: "create-task", title: undefined },
    );
  });

  it("starts a timer on the one task that matches and lands on it", async () => {
    const outcome = await runAssistantAction(
      "start-timer",
      { task: "fix the login bug" },
      now,
    );
    expect(m.createTimeEntry).toHaveBeenCalledWith({
      taskId: "t-1",
      startTime: "2026-10-22T10:30:00.000Z",
    });
    expect(m.updateTimeEntry).not.toHaveBeenCalled();
    expect(outcome).toEqual({
      kind: "task",
      workspaceId: "ws-2",
      projectId: "p-web",
      taskId: "t-1",
      notice: {
        key: "timerStarted",
        params: { title: "Fix the login bug" },
        variant: "success",
      },
    });
  });

  it("stops the previous timer before starting another", async () => {
    m.summary = summary({ runningTimer: running });
    const outcome = await runAssistantAction(
      "start-timer",
      { task: "WEB-12" },
      now,
    );
    expect(m.updateTimeEntry).toHaveBeenCalledWith({
      id: "te-1",
      startTime: "2026-10-22T09:15:30.000Z",
      endTime: "2026-10-22T10:30:00.000Z",
    });
    expect(m.createTimeEntry).toHaveBeenCalledWith({
      taskId: "t-1",
      startTime: "2026-10-22T10:30:00.000Z",
    });
    expect(outcome.notice).toEqual({
      key: "timerSwitched",
      params: { from: "Login page redesign", to: "Fix the login bug" },
      variant: "success",
    });
  });

  it("leaves a timer that already runs on the spoken task alone", async () => {
    m.summary = summary({ runningTimer: running });
    const outcome = await runAssistantAction(
      "start-timer",
      { task: "login page redesign" },
      now,
    );
    expect(m.createTimeEntry).not.toHaveBeenCalled();
    expect(m.updateTimeEntry).not.toHaveBeenCalled();
    expect(outcome).toMatchObject({
      kind: "task",
      taskId: "t-2",
      notice: { key: "timerAlreadyRunning" },
    });
  });

  it("falls back to search when no single task matches", async () => {
    expect(
      await runAssistantAction("start-timer", { task: "login" }, now),
    ).toEqual({
      kind: "search",
      workspaceId: "ws-1",
      query: "login",
      notice: {
        key: "taskAmbiguous",
        params: { query: "login" },
        variant: "info",
      },
    });
    expect(
      await runAssistantAction(
        "start-timer",
        { task: "quarterly report" },
        now,
      ),
    ).toMatchObject({
      kind: "search",
      query: "quarterly report",
      notice: { key: "taskNotFound" },
    });
    expect(await runAssistantAction("start-timer", {}, now)).toEqual({
      kind: "my-tasks",
      workspaceId: "ws-1",
      notice: { key: "sayWhichTask", variant: "info" },
    });
    expect(m.createTimeEntry).not.toHaveBeenCalled();
  });

  it("stops the running timer and reports how long it ran", async () => {
    m.summary = summary({ runningTimer: running });
    const outcome = await runAssistantAction("stop-timer", {}, now);
    expect(m.updateTimeEntry).toHaveBeenCalledWith({
      id: "te-1",
      startTime: "2026-10-22T09:15:30.000Z",
      endTime: "2026-10-22T10:30:00.000Z",
    });
    expect(outcome).toEqual({
      kind: "task",
      workspaceId: "ws-2",
      projectId: "p-web",
      taskId: "t-2",
      notice: {
        key: "timerStopped",
        params: { title: "Login page redesign", duration: "1h 14m 30s" },
        variant: "success",
      },
    });
  });

  it("says so when no timer is running", async () => {
    expect(await runAssistantAction("stop-timer", {}, now)).toEqual({
      kind: "home",
      workspaceId: "ws-1",
      notice: { key: "noRunningTimer", variant: "info" },
    });
    expect(m.updateTimeEntry).not.toHaveBeenCalled();
  });
});
