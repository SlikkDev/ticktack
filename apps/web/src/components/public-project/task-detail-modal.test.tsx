import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ReactNode } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vite-plus/test";
import { getPublicTaskDescription } from "@/fetchers/task/get-description-pages";
import type Task from "@/types/task";
import { PublicTaskDetailModal } from "./task-detail-modal";

vi.mock("@/fetchers/task/get-description-pages", () => ({
  getPublicTaskDescription: vi.fn(),
}));
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("./markdown-renderer", () => ({
  MarkdownRenderer: ({ content }: { content: string }) => <div>{content}</div>,
}));
vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) =>
    open ? <div>{children}</div> : null,
  DialogPopup: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  DialogClose: ({ children }: { children: ReactNode }) => (
    <button type="button">{children}</button>
  ),
}));
const task: Task = {
  id: "task",
  projectId: "project",
  title: "Task",
  number: 1,
  description: null,
  descriptionDeferred: true,
  status: "",
  priority: null,
  startDate: null,
  dueDate: null,
  position: 0,
  createdAt: "2026-01-01T00:00:00Z",
  userId: null,
  assigneeId: null,
  assigneeName: null,
};
let client: QueryClient;
function modal(selected: Task | null, open = true) {
  return (
    <QueryClientProvider client={client}>
      <PublicTaskDetailModal
        task={selected}
        projectSlug="PRJ"
        open={open}
        onOpenChange={() => {}}
      />
    </QueryClientProvider>
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
});
afterEach(() => {
  cleanup();
  client.clear();
});

describe("public deferred task details", () => {
  it("renders nothing and never starts a description request without a selected task", () => {
    const view = render(modal(null));
    expect(view.container).toBeEmptyDOMElement();
    expect(getPublicTaskDescription).not.toHaveBeenCalled();
  });
  it("loads only when opened, shows loading, then renders the full description", async () => {
    let resolve!: (value: string) => void;
    vi.mocked(getPublicTaskDescription).mockReturnValue(
      new Promise<string>((done) => {
        resolve = done;
      }),
    );
    const view = render(modal(task, false));
    expect(getPublicTaskDescription).not.toHaveBeenCalled();
    view.rerender(modal(task));
    expect(screen.getByRole("status").textContent).toContain(
      "descriptionLoading",
    );
    resolve("Full deferred description");
    expect(await screen.findByText("Full deferred description")).toBeTruthy();
    expect(getPublicTaskDescription).toHaveBeenCalledWith(
      "project",
      "task",
      expect.any(AbortSignal),
    );
  });
  it("shows a retry on failure and does not display partial content as success", async () => {
    vi.mocked(getPublicTaskDescription)
      .mockRejectedValueOnce(new Error("changed"))
      .mockResolvedValueOnce("Current revision");
    render(modal(task));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "tasks:descriptionLoadError",
    );
    expect(screen.queryByText("changed")).toBeNull();
    fireEvent.click(screen.getByText("tasks:descriptionRetry"));
    expect(await screen.findByText("Current revision")).toBeTruthy();
    await waitFor(() => expect(screen.queryByRole("alert")).toBeNull());
  });
  it("renders ordinary descriptions without requesting chunks", () => {
    render(
      modal({ ...task, descriptionDeferred: false, description: "Small text" }),
    );
    expect(screen.getByText("Small text")).toBeTruthy();
    expect(getPublicTaskDescription).not.toHaveBeenCalled();
  });
});

it("shows a custom status name in task details without translating the user's text", () => {
  render(
    <QueryClientProvider client={client}>
      <PublicTaskDetailModal
        task={{ ...task, status: "quality-check", descriptionDeferred: false }}
        columns={[{ slug: "quality-check", name: "מוכן ל-QA", isFinal: false }]}
        projectSlug="PRJ"
        open
        onOpenChange={() => {}}
      />
    </QueryClientProvider>,
  );
  expect(screen.getByText("מוכן ל-QA")).toBeInTheDocument();
});
