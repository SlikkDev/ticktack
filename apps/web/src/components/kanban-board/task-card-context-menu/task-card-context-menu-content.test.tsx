import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import i18n from "i18next";
import he from "@i18n/he-IL.json";
import en from "@i18n/en-US.json";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import type Task from "@/types/task";
import TaskCardContextMenuContent from "./task-card-context-menu-content";

vi.mock("i18next", async (importOriginal) => {
  const original = await importOriginal<typeof import("i18next")>();
  return { default: original.createInstance() };
});
const projectColumns: {
  id: string;
  name: string;
  icon: null;
  isFinal: boolean;
}[] = [];
const queriedColumns: {
  slug: string;
  name: string;
  icon: null;
  isFinal: boolean;
}[] = [];
const updateTaskStatus = vi.fn();
beforeEach(async () => {
  await i18n.init({
    lng: "he-IL",
    fallbackLng: "en-US",
    resources: { "he-IL": he, "en-US": en },
  });
});
const duplicateTask = vi.fn();
const canCreateTasks = vi.fn(() => true);
vi.mock("@/hooks/mutations/task/use-duplicate-task", () => ({
  useDuplicateTask: () => ({ mutate: duplicateTask }),
}));

afterEach(() => {
  canCreateTasks.mockReturnValue(true);
  projectColumns.length = 0;
  queriedColumns.length = 0;
  cleanup();
  vi.clearAllMocks();
});

vi.mock("@/components/ui/context-menu", () => ({
  ContextMenuContent: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <div>{children}</div>,
  ContextMenuItem: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick?: () => void;
  }): React.JSX.Element => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
  ContextMenuSeparator: (): React.JSX.Element => <div />,
  ContextMenuSub: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <div>{children}</div>,
  ContextMenuSubContent: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <div>{children}</div>,
  ContextMenuSubTrigger: ({
    children,
  }: {
    children: React.ReactNode;
  }): React.JSX.Element => <div>{children}</div>,
  ContextMenuCheckboxItem: ({
    children,
    onCheckedChange,
  }: {
    children: React.ReactNode;
    onCheckedChange?: () => void;
  }): React.JSX.Element => (
    <button type="button" onClick={onCheckedChange}>
      {children}
    </button>
  ),
}));

vi.mock("@/hooks/queries/column/use-get-columns", () => ({
  useGetColumns: () => ({
    data: queriedColumns,
  }),
}));

vi.mock(
  "@/hooks/queries/workspace-users/use-get-active-workspace-users",
  () => ({
    useGetActiveWorkspaceUsers: () => ({
      data: { members: [] },
    }),
  }),
);

vi.mock("@/hooks/queries/workspace-users/use-get-project-members", () => ({
  default: () => ({ data: [] }),
}));

vi.mock("@tanstack/react-query", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@tanstack/react-query")>()),
  useQueryClient: () => ({ getQueryData: () => [] }),
}));

vi.mock("@/hooks/mutations/task/use-update-task", () => ({
  useUpdateTask: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/task/use-update-task-assignee", () => ({
  useUpdateTaskAssignee: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/task/use-update-task-description", () => ({
  useUpdateTaskDescription: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/task/use-update-task-due-date", () => ({
  useUpdateTaskDueDate: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/task/use-update-task-status", () => ({
  useUpdateTaskStatus: () => ({ mutateAsync: updateTaskStatus }),
}));

vi.mock("@/hooks/mutations/task/use-update-task-status-priority", () => ({
  useUpdateTaskPriority: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/mutations/task/use-update-task-title", () => ({
  useUpdateTaskTitle: () => ({ mutateAsync: vi.fn() }),
}));

vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canCreateTasks,
    canUpdateTasks: () => true,
    canDeleteTasks: () => true,
    canAssignTasks: () => true,
  }),
}));

vi.mock("@/store/project", () => ({
  default: () => ({
    project: {
      columns: projectColumns,
    },
  }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, options?: { title?: string }) =>
      options?.title ? `${key}|${options.title}` : key,
  }),
}));

const task = {
  id: "task-1",
  title: "Test task",
  number: 1,
  description: null,
  status: "to-do",
  priority: null,
  startDate: null,
  dueDate: null,
  position: 1,
  createdAt: "2026-08-05T00:00:00.000Z",
  userId: null,
  assigneeId: null,
  assigneeName: null,
  projectId: "project-1",
} as const satisfies Task;

const taskCardContext = {
  projectId: "project-1",
  worskpaceId: "workspace-1",
};

function renderTask(taskToRender: Task) {
  render(
    <TaskCardContextMenuContent
      task={taskToRender}
      taskCardContext={taskCardContext}
      onDeleteClick={vi.fn()}
    />,
  );
}

describe("TaskCardContextMenuContent", () => {
  it("hides Mark as planned for planned tasks", () => {
    renderTask({
      ...task,
      status: "planned",
    });

    expect(
      screen.queryByText("tasks:actions.markAsPlanned"),
    ).not.toBeInTheDocument();
  });

  it("shows Mark as planned for tasks that are not planned", () => {
    renderTask(task);

    expect(screen.getByText("tasks:actions.markAsPlanned")).toBeInTheDocument();
  });
});

it("duplicates using the localized title suffix", () => {
  renderTask(task);
  fireEvent.click(
    screen.getByRole("button", { name: "tasks:actions.duplicate" }),
  );
  expect(duplicateTask).toHaveBeenCalledWith({
    taskId: task.id,
    title: `tasks:duplicate.titleSuffix|${task.title}`,
  });
});
it("hides duplication without task-create permission", () => {
  canCreateTasks.mockReturnValue(false);
  renderTask(task);
  expect(screen.queryByText("tasks:actions.duplicate")).toBeNull();
});

describe.each(["project", "query"] as const)(
  "%s context status source",
  (source) => {
    it.each(["he-IL", "en-US"] as const)(
      "localizes built-ins in %s and preserves custom names and mutation values",
      async (locale) => {
        await i18n.changeLanguage(locale);
        const columns = [
          {
            id: "in-progress",
            slug: "in-progress",
            name: "In Progress",
            icon: null,
            isFinal: false,
          },
          {
            id: "review-team",
            slug: "review-team",
            name: "Team Review",
            icon: null,
            isFinal: false,
          },
        ];
        if (source === "project") projectColumns.push(...columns);
        else queriedColumns.push(...columns);
        renderTask(task);
        const label = (locale === "he-IL" ? he : en).tasks.status[
          "in-progress"
        ];
        fireEvent.click(screen.getByRole("button", { name: label }));
        expect(updateTaskStatus).toHaveBeenCalledWith({
          ...task,
          status: "in-progress",
        });
        expect(
          screen.getByRole("button", { name: "Team Review" }),
        ).toBeInTheDocument();
        expect(columns[0].name).toBe("In Progress");
      },
    );
  },
);
