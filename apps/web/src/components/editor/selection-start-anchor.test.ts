import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, expect, it, vi } from "vite-plus/test";
import { selectionStartAnchor } from "./selection-start-anchor";

let editor: Editor;
afterEach(() => editor?.destroy());

it.each([
  { start: 300, end: 150, left: 150 },
  { start: 150, end: 300, left: 150 },
])(
  "anchors a selected line when its logical start is at $start",
  ({ start, end, left }) => {
    editor = new Editor({
      extensions: [StarterKit],
      content: "<p>שלום עולם</p>",
    });
    editor.commands.setTextSelection({ from: 1, to: 5 });
    vi.spyOn(editor.view, "coordsAtPos").mockImplementation((position) => ({
      left: position === 1 ? start : end,
      right: position === 1 ? start : end,
      top: 10,
      bottom: 30,
    }));
    const rect = selectionStartAnchor(editor)?.getBoundingClientRect();
    expect(rect?.left).toBe(left);
    expect(rect?.width).toBe(150);
  },
);
