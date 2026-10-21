import { Editor } from "@tiptap/core";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { Markdown } from "@tiptap/markdown";
import { CellSelection, columnResizingPluginKey } from "@tiptap/pm/tables";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { createDirectionalTable } from "./directional-table";
import {
  columnWidthTransaction,
  resizedColumnWidth,
} from "./directional-table-resizing";
import { TextDirection } from "./text-direction";

let editor: Editor;
afterEach(() => editor?.destroy());

function build(
  content = '<table><tr><td colwidth="100"><p>א</p></td><td colwidth="100"><p>B</p></td></tr><tr><td colspan="2" colwidth="100,100"><p>משולב</p></td></tr></table>',
) {
  editor = new Editor({
    extensions: [
      StarterKit.configure({ trailingNode: false }),
      createDirectionalTable().configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      TextDirection,
      Markdown,
    ],
    content,
  });
  return editor;
}

it("grows RTL columns toward the left and respects minimum widths", () => {
  expect(resizedColumnWidth(100, -40, 25, "rtl")).toBe(140);
  expect(resizedColumnWidth(100, 200, 25, "rtl")).toBe(25);
  expect(resizedColumnWidth(100, 40, 25, "ltr")).toBe(140);
  expect(resizedColumnWidth(311.5, -60, 25, "rtl")).toBe(372);
});

it("preserves resized column widths and mixed marked content through Markdown saves", () => {
  build(
    '<table><tr><th colwidth="160"><p><strong>שלום &amp; Hello</strong></p></th><th colwidth="100"><p>English</p></th></tr><tr><td colwidth="160"><p>אבג</p></td><td colwidth="100"><p>XYZ</p></td></tr></table>',
  );
  const markdown = editor.getMarkdown();
  expect(markdown).toContain('colwidth="160"');
  expect(markdown).toContain("<strong>שלום &amp; Hello</strong>");
  editor.commands.setContent(markdown, { contentType: "markdown" });
  expect(
    editor.state.doc.firstChild?.firstChild?.firstChild?.attrs.colwidth,
  ).toEqual([160]);
  expect(editor.getText()).toContain("שלום & Hello");
  expect(editor.getMarkdown()).toBe(markdown);
});

it("updates the selected logical column across merged cells", () => {
  build();
  editor.view.dispatch(columnWidthTransaction(editor.state, 2, 140));
  const table = editor.state.doc.firstChild!;
  expect(table.child(0).child(0).attrs.colwidth).toEqual([140]);
  expect(table.child(0).child(1).attrs.colwidth).toEqual([100]);
  expect(table.child(1).child(0).attrs.colwidth).toEqual([140, 100]);
});

it("uses the left edge of an RTL cell and commits one resize at pointer release", () => {
  build();
  const table = editor.view.dom.querySelector("table")!;
  table.style.direction = "rtl";
  const cell = table.querySelector("td")!;
  vi.spyOn(cell, "getBoundingClientRect").mockReturnValue(
    new DOMRect(200, 0, 100, 40),
  );
  cell.dispatchEvent(
    new MouseEvent("mousemove", { bubbles: true, clientX: 201, clientY: 20 }),
  );
  expect(columnResizingPluginKey.getState(editor.state)?.activeHandle).toBe(2);
  cell.dispatchEvent(
    new MouseEvent("mousedown", {
      bubbles: true,
      cancelable: true,
      clientX: 201,
      clientY: 20,
      button: 0,
    }),
  );
  window.dispatchEvent(
    new MouseEvent("mousemove", { clientX: 161, buttons: 1 }),
  );
  expect(
    editor.state.doc.firstChild!.firstChild!.firstChild!.attrs.colwidth,
  ).toEqual([100]);
  window.dispatchEvent(new MouseEvent("mouseup", { clientX: 161 }));
  expect(
    editor.state.doc.firstChild!.firstChild!.firstChild!.attrs.colwidth,
  ).toEqual([140]);
  expect(columnResizingPluginKey.getState(editor.state)?.dragging).toBeNull();
});

it("extends an RTL cell selection toward the visually left column with Shift+ArrowLeft", () => {
  build();
  editor.view.dom.querySelector("table")!.style.direction = "rtl";
  editor.view.dispatch(
    editor.state.tr.setSelection(CellSelection.create(editor.state.doc, 2)),
  );
  const event = new KeyboardEvent("keydown", {
    key: "ArrowLeft",
    shiftKey: true,
    bubbles: true,
    cancelable: true,
  });
  editor.view.dom.dispatchEvent(event);
  expect(event.defaultPrevented).toBe(true);
  const selection = editor.state.selection as CellSelection;
  expect(selection.$anchorCell.pos).toBe(2);
  expect(selection.$headCell.pos).toBe(7);
});
