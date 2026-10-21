import { Editor } from "@tiptap/core";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import TableRow from "@tiptap/extension-table-row";
import StarterKit from "@tiptap/starter-kit";
import { TextSelection } from "@tiptap/pm/state";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { createDirectionalTable } from "./directional-table";

let editor: Editor;
afterEach(() => {
  editor?.destroy();
  vi.restoreAllMocks();
});

it.each([
  ["Hebrew", "rtl", "rtl", "אבג", "דהו"],
  ["English", "ltr", "ltr", "ABC", "DEF"],
  ["Hebrew to English", "rtl", "ltr", "אבג", "DEF"],
  ["English to Hebrew", "ltr", "rtl", "ABC", "דהו"],
])(
  "enters the adjacent physical text boundary in both directions: %s",
  (_name, firstDirection, secondDirection, firstText, secondText) => {
    editor = new Editor({
      extensions: [
        StarterKit.configure({ trailingNode: false }),
        createDirectionalTable(),
        TableRow,
        TableCell,
        TableHeader,
      ],
      content: `<table><tr><td><p>${firstText}</p></td><td><p>${secondText}</p></td></tr></table>`,
    });
    editor.view.dom.querySelector("table")!.style.direction = "rtl";
    const paragraphs = editor.view.dom.querySelectorAll("td p");
    (paragraphs[0] as HTMLElement).style.direction = firstDirection;
    (paragraphs[1] as HTMLElement).style.direction = secondDirection;
    const starts: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "paragraph") starts.push(pos + 1);
    });
    const atBoundary = vi
      .spyOn(editor.view, "endOfTextblock")
      .mockReturnValue(true);

    for (const key of ["ArrowLeft", "ArrowRight"]) {
      const source = key === "ArrowLeft" ? 0 : 1;
      const target = 1 - source;
      const sourceRtl = [firstDirection, secondDirection][source] === "rtl";
      const targetRtl = [firstDirection, secondDirection][target] === "rtl";
      const sourceOffset = (key === "ArrowLeft") === sourceRtl ? 3 : 0;
      const targetOffset = (key === "ArrowRight") === targetRtl ? 3 : 0;
      editor.view.dispatch(
        editor.state.tr.setSelection(
          TextSelection.create(editor.state.doc, starts[source] + sourceOffset),
        ),
      );
      const event = new KeyboardEvent("keydown", {
        key,
        bubbles: true,
        cancelable: true,
      });
      editor.view.dom.dispatchEvent(event);
      expect(event.defaultPrevented).toBe(true);
      expect(atBoundary).toHaveBeenLastCalledWith(
        key === "ArrowLeft" ? "left" : "right",
      );
      expect(editor.state.selection.from).toBe(starts[target] + targetOffset);
      expect(editor.state.selection.$head.parent.textContent).toBe(
        [firstText, secondText][target],
      );
    }
  },
);

it.each([
  ["ArrowRight", "rtl", "ltr", 1, 0],
  ["ArrowRight", "ltr", "rtl", 1, 3],
  ["ArrowLeft", "rtl", "ltr", 2, 0],
  ["ArrowLeft", "ltr", "rtl", 2, 3],
])(
  "uses the entered paragraph direction in multiline cells: %s %s/%s",
  (key, firstDirection, lastDirection, targetParagraph, targetOffset) => {
    editor = new Editor({
      extensions: [
        StarterKit.configure({ trailingNode: false }),
        createDirectionalTable(),
        TableRow,
        TableCell,
        TableHeader,
      ],
      content:
        "<table><tr><td><p>אבג</p><p>ABC</p></td><td><p>דהו</p><p>DEF</p></td></tr></table>",
    });
    editor.view.dom.querySelector("table")!.style.direction = "rtl";
    const paragraphs = editor.view.dom.querySelectorAll("td p");
    for (const [index, paragraph] of paragraphs.entries())
      (paragraph as HTMLElement).style.direction =
        index % 2 ? lastDirection : firstDirection;
    const starts: number[] = [];
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name === "paragraph") starts.push(pos + 1);
    });
    vi.spyOn(editor.view, "endOfTextblock").mockReturnValue(true);
    // Force the source cell to one direction; target retains mixed paragraphs.
    const sourceCell = key === "ArrowLeft" ? 0 : 1;
    for (const index of [sourceCell * 2, sourceCell * 2 + 1])
      (paragraphs[index] as HTMLElement).style.direction = "rtl";
    const sourceParagraphIndex = key === "ArrowLeft" ? 1 : 2;
    const sourceOffset = key === "ArrowLeft" ? 3 : 0;
    editor.view.dispatch(
      editor.state.tr.setSelection(
        TextSelection.create(
          editor.state.doc,
          starts[sourceParagraphIndex] + sourceOffset,
        ),
      ),
    );
    const event = new KeyboardEvent("keydown", {
      key,
      bubbles: true,
      cancelable: true,
    });
    editor.view.dom.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(editor.state.selection.from).toBe(
      starts[targetParagraph] + targetOffset,
    );
  },
);
