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
/** Widest the board (belt included) may grow on tall screens: the 720 view minus a margin. */
const BOARD_MAX = 680;
const BELT = 64;
const JAR = 84;
/** Touch area added around each waiting slot, at least: a slot is then 100 units (50 px on a 360 px phone). */
export const SLOT_HIT_PAD = 8;
/** Smallest comfortable touch target, in real CSS pixels. */
export const MIN_TOUCH_PX = 44;

/**
 * `screenHeight` is the real height of the game in logical units (1280 on a 16:9 phone, up to ~1900 on tall ones).
 * The header stays on top, the controls (waiting slots and columns) are anchored to the bottom edge, near the thumb,
 * and the board takes a bit more room and is centred in the space between them.
 */
export function computeLayout(
  width: number,
  height: number,
  slotCount: number,
  columnCount: number,
  screenHeight: number = VIEW.height,
): Layout {
  const screen = Math.max(VIEW.height, screenHeight);
  const extra = screen - VIEW.height;
  const boardSize = Math.min(BOARD_MAX, BOARD_SIZE + extra / 2);
  const inner = boardSize - 2 * BELT;
  const cell = Math.floor(inner / Math.max(width, height));
  const cw = cell * width;
  const ch = cell * height;
  // Space between the header and the slots, minus the board: split above and below it.
  const slotY = screen - (VIEW.height - (BOARD_TOP + BOARD_SIZE + 40));
  const freeAbove = Math.max(0, (slotY - 40 - BOARD_TOP - boardSize) / 2);
  const canvas = { x: (VIEW.width - cw) / 2, y: BOARD_TOP + freeAbove + BELT + (inner - ch) / 2, w: cw, h: ch };
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
    h: screen - colY - 24,
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

/** The rectangle grown by `pad` on every side (touch areas larger than what is drawn). */
export function inflate(r: Rect, pad: number): Rect {
  return { x: r.x - pad, y: r.y - pad, w: r.w + 2 * pad, h: r.h + 2 * pad };
}

/**
 * The waiting slot under a tap, or -1. The touch area is the slot plus a margin that grows on small screens so it is
 * never under `minSize` logical units (44 px converted with the real scale); where two areas overlap, the slot whose
 * centre is nearest wins.
 */
export function slotAt(slots: readonly Rect[], p: Point, minSize: number): number {
  let best = -1;
  let bestDistance = Infinity;
  slots.forEach((r, i) => {
    const pad = Math.min(40, Math.max(SLOT_HIT_PAD, (minSize - r.w) / 2));
    if (!contains(inflate(r, pad), p)) return;
    const distance = Math.abs(p.x - (r.x + r.w / 2));
    if (distance < bestDistance) {
      best = i;
      bestDistance = distance;
    }
  });
  return best;
}

export function contains(r: Rect, p: Point): boolean {
  return p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
}
