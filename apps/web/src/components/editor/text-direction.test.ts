import { Editor } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import { afterEach, expect, it } from "vite-plus/test";
import { TextDirection } from "./text-direction";

let editor: Editor;
afterEach(() => editor?.destroy());

it("isolates mixed prose, links and code without changing their text", () => {
  editor = new Editor({
    extensions: [StarterKit, TextDirection],
    content:
      '<p>שלום API-123</p><p>Hello עולם <a href="https://example.com">example.com</a></p><pre><code>const x = "שלום";</code></pre>',
  });
  const html = document.createElement("div");
  html.innerHTML = editor.getHTML();
  expect([...html.querySelectorAll("p")].map((p) => p.dir)).toEqual([
    "auto",
    "auto",
  ]);
  expect(html.querySelector("a")).toHaveAttribute("dir", "auto");
  expect(html.querySelector("pre")).toHaveAttribute("dir", "ltr");
  expect(html.textContent).toBe(
    'שלום API-123Hello עולם example.comconst x = "שלום";',
  );
});
