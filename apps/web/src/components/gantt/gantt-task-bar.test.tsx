import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { addDays } from "date-fns";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import type Task from "@/types/task";
import { GanttTaskBar } from "./gantt-task-bar";

const mocks = vi.hoisted(() => ({
  locale: "he-IL",
  update: vi.fn(),
  open: vi.fn(),
  error: vi.fn(),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { resolvedLanguage: mocks.locale },
  }),
}));
vi.mock("@/hooks/mutations/task/use-update-task", () => ({
  useUpdateTask: () => ({ mutateAsync: mocks.update }),
}));
vi.mock("@/lib/toast", () => ({ toast: { error: mocks.error } }));

const rangeStart = new Date(2026, 9, 1);
const timeline = {
  rangeStart,
  days: Array.from({ length: 10 }, (_, index) => addDays(rangeStart, index)),
  gridTemplateColumns: "repeat(10, 44px)",
};
const task: Task & { scheduleStart: Date; scheduleEnd: Date } = {
  id: "task-1",
  title: "בדיקת API",
  number: 12,
  description: null,
  status: "to-do",
  priority: null,
  startDate: new Date(2026, 9, 3).toISOString(),
  dueDate: new Date(2026, 9, 5).toISOString(),
  position: 1,
  createdAt: new Date(2026, 9, 1).toISOString(),
  userId: null,
  assigneeId: null,
  assigneeName: null,
  projectId: "project-1",
  scheduleStart: new Date(2026, 9, 3),
  scheduleEnd: new Date(2026, 9, 5),
};

beforeEach(() => {
  mocks.locale = "he-IL";
  mocks.update.mockResolvedValue({});
  vi.stubGlobal("PointerEvent", MouseEvent);
});
afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function show() {
  return render(
    <GanttTaskBar
      task={task}
      timeline={timeline}
      pixelsPerDay={44}
      onOpenTask={mocks.open}
    />,
  );
}

function drag(
  label: string,
  delta: number,
  endEvent: "pointerUp" | "pointerCancel" = "pointerUp",
) {
  fireEvent.pointerDown(screen.getByRole("button", { name: label }), {
    clientX: 400,
    button: 0,
  });
  fireEvent.pointerMove(window, { clientX: 400 + delta });
  fireEvent[endEvent](window, { clientX: 400 + delta });
}

function expectDates(startDay: number, endDay: number) {
  expect(mocks.update).toHaveBeenCalledWith(
    expect.objectContaining({
      id: task.id,
      startDate: new Date(2026, 9, startDay).toISOString(),
      dueDate: new Date(2026, 9, endDay).toISOString(),
    }),
  );
}

describe("Gantt directional scheduling", () => {
  it.each([
    ["he-IL", -88, 5, 7],
    ["he-IL", 88, 1, 3],
    ["en-US", 88, 5, 7],
    ["en-US", -88, 1, 3],
  ])("persists a %s move of %ipx", async (locale, delta, start, end) => {
    mocks.locale = locale;
    show();
    drag("tasks:gantt.taskAriaLabel", delta);
    await waitFor(() => expectDates(start, end));
    expect(mocks.open).not.toHaveBeenCalled();
  });

  it.each([
    ["tasks:gantt.resizeStart", -44, 4, 5],
    ["tasks:gantt.resizeStart", 44, 2, 5],
    ["tasks:gantt.resizeDue", -44, 3, 6],
    ["tasks:gantt.resizeDue", 44, 3, 4],
  ])(
    "persists the RTL %s boundary after %ipx",
    async (label, delta, start, end) => {
      show();
      drag(label, delta);
      await waitFor(() => expectDates(start, end));
    },
  );

  it("clamps the end boundary at the start rather than inverting dates", async () => {
    show();
    drag("tasks:gantt.resizeDue", 440);
    await waitFor(() => expectDates(3, 3));
  });

  it("discards a canceled drag without persisting a date change", () => {
    const { container } = show();
    drag("tasks:gantt.taskAriaLabel", -88, "pointerCancel");
    expect(mocks.update).not.toHaveBeenCalled();
    expect(
      container.querySelector("[style*='grid-column']")?.getAttribute("style"),
    ).toContain("grid-column: 3 / 6");
  });

  it("restores the rendered bar when saving fails", async () => {
    mocks.update.mockRejectedValueOnce(new Error("save failed"));
    const { container } = show();
    drag("tasks:gantt.taskAriaLabel", -88);
    await waitFor(() => {
      expect(mocks.error).toHaveBeenCalled();
      expect(
        container
          .querySelector("[style*='grid-column']")
          ?.getAttribute("style"),
      ).toContain("grid-column: 3 / 6");
    });
  });

  it("moves and resizes by keyboard in physical arrow direction", async () => {
    show();
    fireEvent.keyDown(
      screen.getByRole("button", { name: "tasks:gantt.resizeStart" }),
      {
        key: "ArrowLeft",
      },
    );
    await waitFor(() => expectDates(4, 5));
    mocks.update.mockClear();
    fireEvent.keyDown(
      screen.getByRole("button", { name: "tasks:gantt.taskAriaLabel" }),
      {
        key: "ArrowRight",
      },
    );
    await waitFor(() => expectDates(3, 4));
  });

  it("continues from the visible dates before refreshed task data arrives", async () => {
    show();
    const bar = screen.getByRole("button", {
      name: "tasks:gantt.taskAriaLabel",
    });
    fireEvent.keyDown(bar, { key: "ArrowLeft" });
    await waitFor(() => expectDates(4, 6));
    mocks.update.mockClear();
    fireEvent.keyDown(bar, { key: "ArrowLeft" });
    await waitFor(() => expectDates(5, 7));
  });

  it("keeps Enter available to open task details", () => {
    show();
    fireEvent.keyDown(
      screen.getByRole("button", { name: "tasks:gantt.taskAriaLabel" }),
      {
        key: "Enter",
      },
    );
    expect(mocks.open).toHaveBeenCalledOnce();
    expect(mocks.update).not.toHaveBeenCalled();
  });
});
