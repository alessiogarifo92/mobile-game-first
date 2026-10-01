/** Screen geometry for a level, in the game's logical resolution. Pure so it can be unit-tested. */
export const VIEW = { width: 720, height: 1280 } as const;

export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Layout {
  cell: number;
  canvas: Rect;
  /** Outer rectangle of the belt (canvas + belt thickness). */
  belt: Rect;
  beltThickness: number;
  /** Centre of each lane on the belt, in belt order. */
  lanes: Point[];
  /** Where shooters wait to board (bottom-left corner of the belt). */
  entry: Point;
  slots: Rect[];
  columns: Rect[];
  /** Vertical distance between shooters drawn in a column. */
  columnStep: number;
  jar: number;
}

const BOARD_TOP = 150;
const BOARD_SIZE = 600;
const BELT = 64;
const JAR = 84;

export function computeLayout(width: number, height: number, slotCount: number, columnCount: number): Layout {
  const inner = BOARD_SIZE - 2 * BELT;
  const cell = Math.floor(inner / Math.max(width, height));
  const cw = cell * width;
  const ch = cell * height;
  const canvas = { x: (VIEW.width - cw) / 2, y: BOARD_TOP + BELT + (inner - ch) / 2, w: cw, h: ch };
  const belt = { x: canvas.x - BELT, y: canvas.y - BELT, w: cw + 2 * BELT, h: ch + 2 * BELT };
  const half = BELT / 2;
  const lanes: Point[] = [];
  const bottom = canvas.y + ch + half;
  const right = canvas.x + cw + half;
  const top = canvas.y - half;
  const left = canvas.x - half;
  for (let x = 0; x < width; x++) lanes.push({ x: canvas.x + (x + 0.5) * cell, y: bottom });
  for (let k = 0; k < height; k++) lanes.push({ x: right, y: canvas.y + (height - 1 - k + 0.5) * cell });
  for (let k = 0; k < width; k++) lanes.push({ x: canvas.x + (width - 1 - k + 0.5) * cell, y: top });
  for (let y = 0; y < height; y++) lanes.push({ x: left, y: canvas.y + (y + 0.5) * cell });

  const slotSize = JAR;
  const slotGap = 16;
  const slotsWidth = slotCount * slotSize + (slotCount - 1) * slotGap;
  const slotY = BOARD_TOP + BOARD_SIZE + 40;
  const slots = Array.from({ length: slotCount }, (_, i) => ({
    x: (VIEW.width - slotsWidth) / 2 + i * (slotSize + slotGap),
    y: slotY,
    w: slotSize,
    h: slotSize,
  }));

  const colW = 120;
  const colGap = 24;
  const colsWidth = columnCount * colW + (columnCount - 1) * colGap;
  const colY = slotY + slotSize + 50;
  const columns = Array.from({ length: columnCount }, (_, i) => ({
    x: (VIEW.width - colsWidth) / 2 + i * (colW + colGap),
    y: colY,
    w: colW,
    h: VIEW.height - colY - 24,
  }));

  return {
    cell,
    canvas,
    belt,
    beltThickness: BELT,
    lanes,
    entry: { x: left, y: bottom },
    slots,
    columns,
    columnStep: 96,
    jar: JAR,
  };
}

/** Position on the belt for a fractional lane index (wraps around). */
export function beltPoint(layout: Layout, lane: number): Point {
  const n = layout.lanes.length;
  const wrapped = ((lane % n) + n) % n;
  const i = Math.floor(wrapped);
  const f = wrapped - i;
  const a = layout.lanes[i]!;
  const b = layout.lanes[(i + 1) % n]!;
  return { x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f };
}

export function cellRect(layout: Layout, width: number, cell: number): Rect {
  const x = cell % width;
  const y = Math.floor(cell / width);
  return { x: layout.canvas.x + x * layout.cell, y: layout.canvas.y + y * layout.cell, w: layout.cell, h: layout.cell };
}

export function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
