import type { Layout, Rect } from './layout';

/**
 * Geometry of a tunnel over the belt (#99), in the game's logical units, pure so it is unit-tested like the ice and
 * the film. The roof is a band laid over the belt lanes that are blind: opaque, so a bucket disappears under it and
 * shows again at the other mouth. It stays inside the belt ring, so it can never cover the canvas, the waiting slots
 * or the columns.
 */

/** Gap kept between the roof and the edges of the belt ring. */
export const ROOF_INSET = 3;
/** How far a mouth (the frame at each end of the tunnel) reaches along the belt, centred on the end of the roof. */
export const MOUTH_DEPTH = 10;

/** Depth of the roof: above the buckets and their ammo (depth 5) so they slip under it, below the banner and cards that open over the board. */
export const ROOF_DEPTH = 5.5;

export type BeltSide = 'bottom' | 'right' | 'top' | 'left';

/** Side of the belt a lane runs along, in `buildLanes` order: bottom, right, top, left. */
export function laneSide(lane: number, width: number, height: number): BeltSide {
  if (lane < 0 || lane >= 2 * (width + height)) throw new Error(`lane ${lane} is not on the belt`);
  if (lane < width) return 'bottom';
  if (lane < width + height) return 'right';
  if (lane < 2 * width + height) return 'top';
  return 'left';
}

/** Direction a bucket travels along a side: bottom →, right ↑, top ←, left ↓. */
const DIRECTION: Record<BeltSide, { x: number; y: number }> = {
  bottom: { x: 1, y: 0 },
  right: { x: 0, y: -1 },
  top: { x: -1, y: 0 },
  left: { x: 0, y: 1 },
};

export interface TunnelRoof {
  /** Rectangles that together make the roof (runs along a side, and the corner blocks where it turns). */
  pieces: Rect[];
  /** The frame at each end of the tunnel, across the belt. */
  mouths: Rect[];
}

const union = (a: Rect, b: Rect): Rect => {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
};

/**
 * The roof of the lanes in `tunnels` (sorted, contiguous: see `parseTunnels`). Each lane gets the stretch of belt it
 * shoots from, one cell long; lanes on the same side merge, and a tunnel that turns a corner gets the corner filled.
 */
export function tunnelRoof(layout: Layout, width: number, height: number, tunnels: readonly number[]): TunnelRoof {
  if (tunnels.length === 0) return { pieces: [], mouths: [] };
  const { cell, beltThickness } = layout;
  const band = beltThickness - 2 * ROOF_INSET; // thickness of the roof across the belt
  const laneRect = (lane: number): Rect => {
    const p = layout.lanes[lane]!;
    const horizontal = laneSide(lane, width, height) === 'bottom' || laneSide(lane, width, height) === 'top';
    return horizontal ? { x: p.x - cell / 2, y: p.y - band / 2, w: cell, h: band } : { x: p.x - band / 2, y: p.y - cell / 2, w: band, h: cell };
  };
  const pieces: Rect[] = [];
  tunnels.forEach((lane, k) => {
    const rect = laneRect(lane);
    const before = tunnels[k - 1];
    const last = pieces.length - 1;
    if (before !== undefined && laneSide(before, width, height) === laneSide(lane, width, height)) pieces[last] = union(pieces[last]!, rect);
    else {
      if (before !== undefined) {
        // The tunnel turns a corner: both runs reach the corner square, which belongs to both.
        const prev = layout.lanes[before]!;
        const next = layout.lanes[lane]!;
        const beforeHorizontal = laneSide(before, width, height) === 'bottom' || laneSide(before, width, height) === 'top';
        const corner = beforeHorizontal ? { x: next.x, y: prev.y } : { x: prev.x, y: next.y };
        const square = { x: corner.x - band / 2, y: corner.y - band / 2, w: band, h: band };
        pieces[last] = union(pieces[last]!, square);
        pieces.push(union(square, rect));
        return;
      }
      pieces.push(rect);
    }
  });
  const mouth = (lane: number, atEnd: boolean): Rect => {
    const side = laneSide(lane, width, height);
    const d = DIRECTION[side];
    const p = layout.lanes[lane]!;
    const sign = atEnd ? 1 : -1;
    const c = { x: p.x + d.x * sign * (cell / 2), y: p.y + d.y * sign * (cell / 2) };
    const across = beltThickness;
    return d.x !== 0
      ? { x: c.x - MOUTH_DEPTH / 2, y: p.y - across / 2, w: MOUTH_DEPTH, h: across }
      : { x: p.x - across / 2, y: c.y - MOUTH_DEPTH / 2, w: across, h: MOUTH_DEPTH };
  };
  return { pieces, mouths: [mouth(tunnels[0]!, false), mouth(tunnels[tunnels.length - 1]!, true)] };
}

/** Whether two rectangles overlap (touching edges do not count). */
export function overlaps(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
}

/** Lines across the roof that read as ties of a tunnel, so it stays legible without its colour: one per lane of the tunnel. */
export function roofTies(layout: Layout, width: number, height: number, tunnels: readonly number[]): [x1: number, y1: number, x2: number, y2: number][] {
  const band = layout.beltThickness - 2 * ROOF_INSET;
  return tunnels.map((lane) => {
    const p = layout.lanes[lane]!;
    const horizontal = laneSide(lane, width, height) === 'bottom' || laneSide(lane, width, height) === 'top';
    return horizontal ? [p.x, p.y - band / 2 + 6, p.x, p.y + band / 2 - 6] : [p.x - band / 2 + 6, p.y, p.x + band / 2 - 6, p.y];
  });
}
