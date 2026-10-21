import type { ClientRect, DroppableContainer } from "@dnd-kit/core";
import { describe, expect, it } from "vite-plus/test";
import { boardCollisionDetection } from "./board-collision-detection";

function rect(left: number, top: number, width: number, height: number) {
  return {
    left,
    top,
    width,
    height,
    right: left + width,
    bottom: top + height,
  } as ClientRect;
}

const rects = new Map([
  ["empty", rect(0, 100, 300, 700)],
  ["doing", rect(320, 100, 300, 700)],
  ["c", rect(330, 110, 280, 80)],
  ["d", rect(330, 200, 280, 80)],
  ["scrolled", rect(330, 10, 280, 80)],
]);

const columnData = {
  empty: { type: "column", column: { id: "empty", tasks: [] } },
  doing: {
    type: "column",
    column: {
      id: "doing",
      tasks: [{ id: "scrolled" }, { id: "c" }, { id: "d" }],
    },
  },
} as Record<string, unknown>;

function detect(pointer: { x: number; y: number } | null, positions = rects) {
  const droppableContainers = [...positions.keys()].map(
    (id) =>
      ({
        id,
        disabled: false,
        data: { current: columnData[id] },
      }) as unknown as DroppableContainer,
  );
  return boardCollisionDetection({
    active: { id: "card" } as never,
    collisionRect: rect(100, 120, 300, 80),
    droppableRects: positions,
    droppableContainers,
    pointerCoordinates: pointer,
  }).map((collision) => collision.id);
}

describe("boardCollisionDetection", () => {
  it("targets the empty column under the pointer over a closer card", () => {
    expect(detect({ x: 150, y: 160 })).toEqual(["empty"]);
  });

  it("targets the card under the pointer", () => {
    expect(detect({ x: 400, y: 150 })).toEqual(["c"]);
  });

  it("targets the last card below a column's cards", () => {
    expect(detect({ x: 400, y: 600 })).toEqual(["d"]);
  });

  it("targets the nearest card in the gap between cards", () => {
    expect(detect({ x: 400, y: 194 })).toEqual(["c"]);
    expect(detect({ x: 400, y: 197 })).toEqual(["d"]);
  });

  it("targets the first card when the pointer is over a column header", () => {
    expect(detect({ x: 400, y: 104 })).toEqual(["c"]);
  });

  it("snaps to the nearer column across the gap between columns", () => {
    expect(detect({ x: 305, y: 160 })).toEqual(["empty"]);
    expect(detect({ x: 315, y: 160 })).toEqual(["c"]);
  });

  it("ignores cards scrolled out of their column", () => {
    expect(detect({ x: 400, y: 50 })).toEqual([]);
    expect(detect({ x: 400, y: 101 })).toEqual(["c"]);
  });

  it("finds nothing outside every column", () => {
    expect(detect({ x: 700, y: 160 })).toEqual([]);
    expect(detect({ x: 400, y: 900 })).toEqual([]);
  });

  it("targets the same cards and empty column when RTL mirrors column positions", () => {
    const mirrored = new Map(
      [...rects].map(([id, position]) => [
        id,
        rect(
          620 - position.right,
          position.top,
          position.width,
          position.height,
        ),
      ]),
    );
    expect(detect({ x: 220, y: 150 }, mirrored)).toEqual(["c"]);
    expect(detect({ x: 220, y: 600 }, mirrored)).toEqual(["d"]);
    expect(detect({ x: 470, y: 160 }, mirrored)).toEqual(["empty"]);
  });

  it("falls back to corner distance without a pointer", () => {
    expect(detect(null)[0]).toBe("c");
  });
});
