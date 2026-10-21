import { Plugin, type EditorState } from "@tiptap/pm/state";
import {
  cellAround,
  columnResizingPluginKey,
  TableMap,
  updateColumnsOnResize,
} from "@tiptap/pm/tables";
import type { EditorView } from "@tiptap/pm/view";

export function resizedColumnWidth(
  startWidth: number,
  deltaX: number,
  minWidth: number,
  direction: string,
) {
  return Math.max(
    minWidth,
    Math.round(startWidth + deltaX * (direction === "rtl" ? -1 : 1)),
  );
}

export function columnWidthTransaction(
  state: EditorState,
  cell: number,
  width: number,
) {
  const $cell = state.doc.resolve(cell);
  const table = $cell.node(-1);
  const start = $cell.start(-1);
  const map = TableMap.get(table);
  const column =
    map.colCount(cell - start) + $cell.nodeAfter!.attrs.colspan - 1;
  const transaction = state.tr;
  const visited = new Set<number>();
  for (let row = 0; row < map.height; row++) {
    const position = map.map[row * map.width + column];
    if (visited.has(position)) continue;
    visited.add(position);
    const attrs = table.nodeAt(position)!.attrs;
    const index = column - map.colCount(position);
    const colwidth: number[] =
      attrs.colwidth?.slice() ?? Array(attrs.colspan).fill(0);
    colwidth[index] = width;
    transaction.setNodeMarkup(start + position, null, { ...attrs, colwidth });
  }
  return transaction;
}

function tableFor(view: EditorView, cell: number) {
  const dom = view.nodeDOM(cell);
  return dom instanceof HTMLElement ? dom.closest("table") : null;
}

// Keep upstream's state, decorations and TableView. Its pointer calculations
// assume LTR, so replace only those handlers for RTL tables.
export function withDirectionalResizing(
  plugin: Plugin,
  handleWidth: number,
  minWidth: number,
  lastColumnResizable: boolean,
) {
  const original = plugin.props.handleDOMEvents;
  let cancelDrag: (() => void) | undefined;
  return new Plugin({
    ...plugin.spec,
    props: {
      ...plugin.props,
      handleDOMEvents: {
        ...original,
        mousemove(view, event) {
          const target =
            event.target instanceof Element
              ? event.target.closest("td, th")
              : null;
          const table = target?.closest("table");
          if (!table || getComputedStyle(table).direction !== "rtl") {
            return original?.mousemove?.call(plugin, view, event);
          }
          if (!view.editable) return false;
          const current = columnResizingPluginKey.getState(view.state);
          if (!current || current.dragging || !target) return false;
          const $cell = cellAround(
            view.state.doc.resolve(view.posAtDOM(target, 0)),
          );
          if (!$cell) return false;
          const rect = target.getBoundingClientRect();
          const map = TableMap.get($cell.node(-1));
          const start = $cell.start(-1);
          let handle = -1;
          if (event.clientX - rect.left <= handleWidth) handle = $cell.pos;
          else if (rect.right - event.clientX <= handleWidth) {
            const index = map.map.indexOf($cell.pos - start);
            if (index % map.width !== 0) handle = start + map.map[index - 1];
          }
          if (handle >= 0 && !lastColumnResizable) {
            const cell = view.state.doc.nodeAt(handle)!;
            if (map.colCount(handle - start) + cell.attrs.colspan === map.width)
              handle = -1;
          }
          if (handle !== current.activeHandle) {
            view.dispatch(
              view.state.tr.setMeta(columnResizingPluginKey, {
                setHandle: handle,
              }),
            );
          }
          return false;
        },
        mousedown(view, event) {
          const current = columnResizingPluginKey.getState(view.state);
          if (!current || current.activeHandle < 0) return false;
          const table = tableFor(view, current.activeHandle);
          if (!table || getComputedStyle(table).direction !== "rtl") {
            return original?.mousedown?.call(plugin, view, event);
          }
          if (!view.editable || current.dragging || event.button !== 0)
            return false;
          const cell = view.state.doc.nodeAt(current.activeHandle)!;
          const dom = view.nodeDOM(current.activeHandle) as HTMLElement;
          const widths: number[] = cell.attrs.colwidth ?? [];
          const knownWidth = widths.reduce((sum, width) => sum + width, 0);
          const unknownColumns =
            cell.attrs.colspan - widths.filter(Boolean).length;
          const startWidth =
            widths.at(-1) ||
            (dom.getBoundingClientRect().width - knownWidth) /
              Math.max(1, unknownColumns);
          const startX = event.clientX;
          const win = view.dom.ownerDocument.defaultView!;
          view.dispatch(
            view.state.tr.setMeta(columnResizingPluginKey, {
              setDragging: { startX, startWidth },
            }),
          );

          const widthAt = (pointer: MouseEvent) =>
            resizedColumnWidth(
              startWidth,
              pointer.clientX - startX,
              minWidth,
              "rtl",
            );
          const cleanup = () => {
            win.removeEventListener("mousemove", move);
            win.removeEventListener("mouseup", finish);
            cancelDrag = undefined;
          };
          const finish = (pointer: MouseEvent) => {
            cleanup();
            const state = columnResizingPluginKey.getState(view.state);
            if (!state?.dragging || state.activeHandle < 0) return;
            view.dispatch(
              columnWidthTransaction(
                view.state,
                state.activeHandle,
                widthAt(pointer),
              ).setMeta(columnResizingPluginKey, { setDragging: null }),
            );
          };
          const move = (pointer: MouseEvent) => {
            if (pointer.buttons === 0) return finish(pointer);
            const state = columnResizingPluginKey.getState(view.state);
            if (!state?.dragging || state.activeHandle < 0) return;
            const $cell = view.state.doc.resolve(state.activeHandle);
            const node = $cell.node(-1);
            const column =
              TableMap.get(node).colCount($cell.pos - $cell.start(-1)) +
              $cell.nodeAfter!.attrs.colspan -
              1;
            const currentTable = tableFor(view, state.activeHandle);
            const colgroup = currentTable?.querySelector("colgroup");
            if (currentTable && colgroup)
              updateColumnsOnResize(
                node,
                colgroup,
                currentTable,
                minWidth,
                column,
                widthAt(pointer),
              );
          };
          cancelDrag = cleanup;
          win.addEventListener("mousemove", move);
          win.addEventListener("mouseup", finish);
          event.preventDefault();
          return true;
        },
      },
    },
    view: () => ({ destroy: () => cancelDrag?.() }),
  });
}
