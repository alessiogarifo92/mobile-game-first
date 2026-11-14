import type { Point } from './brownPixel';

/**
 * Geometry of a frozen pixel's cover (#150), in the pixel's own coordinates. The playtest of #69 read the old cover's
 * three cracks from the centre as a pinwheel or a snowflake (F6): the cover now reads as a pane of ice — a dark rim
 * and two parallel diagonal glints — and carries a counter of the hits that still break it.
 */

/** Hits of the pixel's colour that the ice still takes before the pixel can be painted: one per layer, never negative. */
export function iceHits(layers: number): number {
  return Math.max(0, Math.floor(layers));
}

/**
 * Two parallel glints across the upper-left of the pane, the long one first: quadrilaterals inside the pixel that
 * run from the top edge down to the left edge, the way light catches a polished surface.
 */
export function iceGlints(x: number, y: number, w: number, h: number): Point[][] {
  const band = (from: number, width: number): Point[] => [
    [x + w * from, y + h * 0.12],
    [x + w * (from + width), y + h * 0.12],
    [x + w * 0.12, y + h * (from + width)],
    [x + w * 0.12, y + h * from],
  ];
  return [band(0.42, 0.14), band(0.68, 0.07)];
}

export interface IceBadge {
  x: number;
  y: number;
  r: number;
  text: string;
}

/**
 * The counter of hits that still break the ice, in the lower-right corner (the glints hold the upper-left), or null
 * when the pixel is not frozen. The disc and its rim (0.18 r wide) stay inside the pixel; the radius never drops under 7
 * so the number stays readable on the smallest boards.
 */
export function iceBadge(layers: number, x: number, y: number, w: number, h: number): IceBadge | null {
  const hits = iceHits(layers);
  if (hits === 0) return null;
  const r = Math.max(Math.min(w, h) * 0.24, 7);
  return { x: x + w - r * 1.1, y: y + h - r * 1.1, r, text: String(hits) };
}
