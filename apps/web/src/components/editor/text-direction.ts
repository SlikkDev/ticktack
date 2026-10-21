import { Extension } from "@tiptap/core";

// Resolve prose one block at a time, so adjacent Hebrew and English paragraphs
// keep their own reading order. Code and identifiers retain their literal order.
export const TextDirection = Extension.create({
  name: "kaneoTextDirection",
  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "blockquote",
          "listItem",
          "taskItem",
          "tableCell",
          "tableHeader",
        ],
        attributes: {
          dir: {
            default: "auto",
            parseHTML: () => "auto",
            renderHTML: () => ({ dir: "auto" }),
          },
        },
      },
      {
        types: ["codeBlock", "code"],
        attributes: {
          dir: {
            default: "ltr",
            parseHTML: () => "ltr",
            renderHTML: () => ({ dir: "ltr" }),
          },
        },
      },
      {
        types: ["link"],
        attributes: {
          dir: {
            default: "auto",
            parseHTML: () => "auto",
            renderHTML: () => ({ dir: "auto" }),
          },
        },
      },
    ];
  },
});
