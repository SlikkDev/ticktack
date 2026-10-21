import { Table } from "@tiptap/extension-table";
import type { JSONContent } from "@tiptap/core";
import { DOMSerializer, type Schema } from "@tiptap/pm/model";
import { columnResizingPluginKey, tableEditingKey } from "@tiptap/pm/tables";
import { withDirectionalResizing } from "./directional-table-resizing";
import { withDirectionalTableNavigation } from "./directional-table-navigation";

export function createDirectionalTable() {
  // MarkdownManager binds its own extension context; keep the schema local to
  // this editor instance so its HTML serializer also understands custom nodes.
  let editorSchema: Schema | null = null;
  return Table.extend({
    renderMarkdown(node: JSONContent, helpers, context) {
      const hasWidths = node.content?.some((row) =>
        row.content?.some((cell) =>
          cell.attrs?.colwidth?.some((width: number) => width > 0),
        ),
      );
      if (hasWidths && editorSchema) {
        // GFM has no column-width syntax. Preserve resized tables as safe,
        // schema-generated HTML, as we already do for resized images.
        const element = DOMSerializer.fromSchema(editorSchema).serializeNode(
          editorSchema.nodeFromJSON(node),
        ) as HTMLElement;
        return element.outerHTML;
      }
      return this.parent?.(node, helpers, context) ?? "";
    },
    addProseMirrorPlugins() {
      editorSchema = this.editor.schema;
      return (this.parent?.() ?? []).map((plugin) =>
        plugin.spec.key === columnResizingPluginKey
          ? withDirectionalResizing(
              plugin,
              this.options.handleWidth,
              this.options.cellMinWidth,
              this.options.lastColumnResizable,
            )
          : plugin.spec.key === tableEditingKey
            ? withDirectionalTableNavigation(plugin)
            : plugin,
      );
    },
  });
}
