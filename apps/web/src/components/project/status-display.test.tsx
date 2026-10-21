import { cleanup, render, renderHook, screen } from "@testing-library/react";
import i18n from "i18next";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import en from "@i18n/en-US.json";
import he from "@i18n/he-IL.json";
import { useBulkOptions } from "@/components/bulk-selection/use-bulk-options";
import type { BulkActions } from "@/components/bulk-selection/use-bulk-actions";
import { ColumnHeader } from "@/components/kanban-board/column/column-header";
import ListColumnSection from "@/components/list-view/list-column-section";
import { PublicKanbanView } from "@/components/public-project/kanban-view";
import { PublicListView } from "@/components/public-project/list-view";
import { statusMenuOptions } from "@/components/task/menus/status-menu-options";
import { getStatusDisplayLabel } from "@/lib/i18n/domain";
import type { ProjectWithTasks } from "@/types/project";
import { useFilterSubjects } from "./task-filters/use-filter-subjects";
import type { TaskFilterControls } from "./task-filters/filter-subject";

vi.mock("i18next", async (importOriginal) => {
  const original = await importOriginal<typeof import("i18next")>();
  return { default: original.createInstance() };
});
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: i18n.t.bind(i18n), i18n }),
}));
vi.mock("@/hooks/mutations/task/use-update-task", () => ({
  useUpdateTask: () => ({ mutate: vi.fn() }),
}));
vi.mock("@/hooks/use-workspace-permission", () => ({
  useWorkspacePermission: () => ({
    canUpdateTasks: () => false,
    canCreateTasks: () => false,
  }),
}));
vi.mock("@/store/project", () => ({ default: () => ({ project: undefined }) }));
vi.mock("@/components/shared/modals/create-task-modal", () => ({
  default: () => null,
}));
vi.mock("@/components/shared/modals/archive-tasks-modal", () => ({
  ArchiveTasksModal: () => null,
}));
vi.mock("@/components/list-view/task-row", () => ({ default: () => null }));
vi.mock("@/components/public-project/task-card", () => ({
  PublicTaskCard: () => null,
}));
vi.mock("@/components/public-project/task-row", () => ({
  PublicTaskRow: () => null,
}));

const columns: ProjectWithTasks["columns"] = [
  { id: "to-do", slug: "to-do", name: "To Do", isFinal: false, tasks: [] },
  {
    id: "in-progress",
    slug: "in-progress",
    name: "In Progress",
    isFinal: false,
    tasks: [],
  },
  {
    id: "in-review",
    slug: "in-review",
    name: "In Review",
    isFinal: false,
    tasks: [],
  },
  { id: "done", slug: "done", name: "Done", isFinal: true, tasks: [] },
  {
    id: "ready",
    slug: "ready",
    name: "Ready for QA",
    isFinal: false,
    tasks: [],
  },
].map((column) => ({ ...column, icon: null }));
const project = { id: "project", slug: "TT", columns } as ProjectWithTasks;
const controls: TaskFilterControls = {
  filters: {
    status: ["in-progress"],
    priority: null,
    assignee: null,
    dueDate: null,
    labels: null,
    customFields: null,
  },
  toggleFilter: vi.fn(),
  updateFilter: vi.fn(),
  setNegated: vi.fn(),
  updateCustomFieldFilter: vi.fn(),
  clearFilters: vi.fn(),
  activeFilterCount: 1,
};
const options = {
  members: [],
  labels: [],
  customFields: [],
  usedCustomFieldValues: {},
};

beforeEach(async () => {
  await i18n.init({
    lng: "he-IL",
    fallbackLng: "en-US",
    resources: { "he-IL": he, "en-US": en },
  });
});
afterEach(cleanup);

function expectedLabels(locale: "he-IL" | "en-US") {
  const catalog = locale === "he-IL" ? he : en;
  return [
    ...columns
      .slice(0, 4)
      .map(
        (column) =>
          catalog.tasks.status[
            column.slug as keyof typeof catalog.tasks.status
          ],
      ),
    "Ready for QA",
  ];
}

describe.each(["he-IL", "en-US"] as const)("%s status display", (locale) => {
  it("translates only exact canonical built-ins and preserves custom names", async () => {
    await i18n.changeLanguage(locale);
    expect(
      columns.map((column) => getStatusDisplayLabel(column.slug, column.name)),
    ).toEqual(expectedLabels(locale));
    expect(getStatusDisplayLabel("done", "Approved by Adam")).toBe(
      "Approved by Adam",
    );
    expect(getStatusDisplayLabel("custom", "Done")).toBe("Done");
    expect(getStatusDisplayLabel("to-do", "to do")).toBe("to do");
    expect(columns[0].name).toBe("To Do");
  });

  it("shows localized board and list headings", async () => {
    await i18n.changeLanguage(locale);
    const board = render(
      <>
        {columns.map((column) => (
          <ColumnHeader key={column.id} column={column} />
        ))}
      </>,
    );
    for (const label of expectedLabels(locale))
      expect(screen.getByText(label)).toBeInTheDocument();
    board.unmount();
    render(
      <>
        {columns.map((column) => (
          <ListColumnSection
            key={column.id}
            column={column}
            projectSlug="TT"
            isExpanded={false}
            showDropIndicator={false}
            disableCollectionActions
            onToggle={vi.fn()}
            onAddTask={vi.fn()}
            onArchive={vi.fn()}
          />
        ))}
      </>,
    );
    for (const label of expectedLabels(locale))
      expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("shows the same names in public boards and public lists", async () => {
    await i18n.changeLanguage(locale);
    const board = render(
      <PublicKanbanView project={project} onTaskClick={vi.fn()} />,
    );
    for (const label of expectedLabels(locale))
      expect(screen.getByText(label)).toBeInTheDocument();
    expect(screen.getAllByText(i18n.t("tasks:listView.noTasks"))).toHaveLength(
      columns.length,
    );
    board.unmount();
    render(<PublicListView project={project} onTaskClick={vi.fn()} />);
    for (const label of expectedLabels(locale))
      expect(screen.getByText(label)).toBeInTheDocument();
  });

  it("localizes filter, bulk and task-menu labels while preserving their status values", async () => {
    await i18n.changeLanguage(locale);
    const filters = renderHook(() =>
      useFilterSubjects({
        controls,
        options,
        columns,
        tasks: [],
        showStatus: true,
      }),
    );
    const status = filters.result.current.find(
      (subject) => subject.id === "status",
    )!;
    expect(status.options.map((option) => option.label)).toEqual(
      expectedLabels(locale),
    );
    expect(status.options.map((option) => option.value)).toEqual(
      columns.map((column) => column.id),
    );
    expect(status.selected).toEqual(["in-progress"]);
    const bulk = renderHook(() =>
      useBulkOptions({
        columns,
        members: [],
        labels: [],
      } as unknown as BulkActions),
    );
    expect(
      bulk.result.current.columnOptions.map((option) => option.label),
    ).toEqual(expectedLabels(locale));
    expect(
      bulk.result.current.columnOptions.map((option) => option.value),
    ).toEqual(columns.map((column) => column.id));
    const menu = statusMenuOptions(columns, "in-progress");
    expect(menu.map((option) => option.label)).toEqual(expectedLabels(locale));
    expect(menu.find((option) => option.selected)?.value).toBe("in-progress");
  });
});
