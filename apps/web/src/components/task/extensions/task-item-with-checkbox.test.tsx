import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { Editor } from "@tiptap/core";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { TextDirection } from "@/components/editor/text-direction";
import { TaskItemWithCheckbox } from "./task-item-with-checkbox";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { dir: () => "rtl" },
  }),
}));

let editor: Editor | null = null;
afterEach(() => {
  cleanup();
  editor?.destroy();
  editor = null;
});

it("enables and revokes checklist interaction when permissions arrive without recreating its content", async () => {
  const instance = new Editor({
    editable: false,
    extensions: [StarterKit, TaskList, TaskItemWithCheckbox, TextDirection],
    content:
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="false"><p>123. שלום Task</p></li><li data-type="taskItem"><p>English עברית</p></li></ul>',
  });
  editor = instance;
  render(<EditorContent editor={instance} />);
  const [hebrew, english] = await screen.findAllByRole("checkbox");
  expect(hebrew).toHaveAttribute("aria-disabled", "true");
  expect(hebrew.closest("li")).toHaveAttribute("dir", "rtl");
  expect(english.closest("li")).toHaveAttribute("dir", "ltr");

  act(() => instance.setEditable(true));
  await waitFor(() =>
    expect(hebrew).not.toHaveAttribute("aria-disabled", "true"),
  );
  fireEvent.click(hebrew);
  await waitFor(() => expect(hebrew).toHaveAttribute("aria-checked", "true"));
  expect(instance.state.doc.firstChild?.firstChild?.attrs.checked).toBe(true);

  act(() => instance.setEditable(false));
  await waitFor(() => expect(hebrew).toHaveAttribute("aria-disabled", "true"));
  fireEvent.click(hebrew);
  expect(instance.state.doc.firstChild?.firstChild?.attrs.checked).toBe(true);
  expect(instance.getText()).toContain("123. שלום Task");
});
