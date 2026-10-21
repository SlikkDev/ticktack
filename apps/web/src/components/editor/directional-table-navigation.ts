import { Plugin, Selection, TextSelection } from "@tiptap/pm/state";
import { CellSelection, cellAround, nextCell } from "@tiptap/pm/tables";

export function withDirectionalTableNavigation(plugin: Plugin) {
  return new Plugin({
    ...plugin.spec,
    props: {
      ...plugin.props,
      handleKeyDown(view, event) {
        const { selection } = view.state;
        const $cell =
          selection instanceof CellSelection
            ? selection.$headCell
            : cellAround(selection.$head);
        const cellDom = $cell && view.nodeDOM($cell.pos);
        const table =
          cellDom instanceof HTMLElement ? cellDom.closest("table") : null;
        if (
          !table ||
          getComputedStyle(table).direction !== "rtl" ||
          !["ArrowLeft", "ArrowRight"].includes(event.key) ||
          event.altKey ||
          event.ctrlKey ||
          event.metaKey ||
          !$cell
        ) {
          return plugin.props.handleKeyDown?.call(plugin, view, event) ?? false;
        }
        const logicalDirection = event.key === "ArrowLeft" ? 1 : -1;
        if (!(selection instanceof CellSelection)) {
          if (!(selection instanceof TextSelection) || !selection.empty)
            return false;
          const physicalDirection =
            event.key === "ArrowLeft" ? "left" : "right";
          if (!view.endOfTextblock(physicalDirection)) return false;
          // A physical line edge is not necessarily the edge of a multiline cell.
          const block = view.nodeDOM(selection.$head.before());
          const blockRtl =
            block instanceof HTMLElement &&
            getComputedStyle(block).direction === "rtl";
          const textDirection =
            (event.key === "ArrowLeft") === blockRtl ? 1 : -1;
          for (
            let depth = selection.$head.depth - 1;
            depth > $cell.depth;
            depth--
          ) {
            const index =
              textDirection < 0
                ? selection.$head.index(depth)
                : selection.$head.indexAfter(depth);
            if (
              index !==
              (textDirection < 0 ? 0 : selection.$head.node(depth).childCount)
            )
              return false;
          }
        }
        const $next = nextCell($cell, "horiz", logicalDirection);
        if (event.shiftKey) {
          if (!$next) return false;
          const $anchor =
            selection instanceof CellSelection ? selection.$anchorCell : $cell;
          view.dispatch(
            view.state.tr
              .setSelection(new CellSelection($anchor, $next))
              .scrollIntoView(),
          );
        } else {
          const position = $next
            ? $next.pos +
              (logicalDirection < 0 ? $next.nodeAfter!.nodeSize - 1 : 0)
            : $cell.pos +
              (logicalDirection > 0 ? $cell.nodeAfter!.nodeSize : 0);
          let next = Selection.near(
            view.state.doc.resolve(position),
            logicalDirection,
          );
          if ($next && next instanceof TextSelection) {
            const block = view.nodeDOM(next.$head.before());
            const blockRtl =
              block instanceof HTMLElement &&
              getComputedStyle(block).direction === "rtl";
            // Cell order chooses the first/last textblock. Its own direction
            // chooses the edge facing the source, even in mixed-direction cells.
            const enterAtEnd = (event.key === "ArrowRight") === blockRtl;
            next = TextSelection.create(
              view.state.doc,
              enterAtEnd ? next.$head.end() : next.$head.start(),
            );
          }
          view.dispatch(view.state.tr.setSelection(next).scrollIntoView());
        }
        return true;
      },
    },
  });
}
