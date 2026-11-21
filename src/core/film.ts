import { BLUE, RED, YELLOW, type Primary } from './colors';
import type { Point } from './brownPixel';

/**
 * Geometry of a film over a pixel (#98), in the pixel's own coordinates, pure so it is unit-tested like the ice
 * (core/ice.ts). A film reads without its colour: a dashed border (a sticker), and in the middle the colour-blind
 * glyph of the primary that tears it, the same shape the buckets carry (● red, ▲ yellow, ■ blue).
 */

/** A dashed border segment: from (x1, y1) to (x2, y2). */
export type Dash = readonly [x1: number, y1: number, x2: number, y2: number];

/** Dashes per side of the border: the dashes and the gaps between them are the same length. */
export const FILM_DASHES_PER_SIDE = 3;

/**
 * The dashed border: `FILM_DASHES_PER_SIDE` dashes on each side of the pixel, inset by `inset` so the stroke stays inside
 * it, equal dashes and gaps, clockwise from the top-left corner. Four sides of 3 dashes: 12 segments.
 */
export function filmDashes(x: number, y: number, w: number, h: number, inset = 0): Dash[] {
  const n = FILM_DASHES_PER_SIDE;
  const [x0, y0, x1, y1] = [x + inset, y + inset, x + w - inset, y + h - inset];
  const out: Dash[] = [];
  const side = (ax: number, ay: number, bx: number, by: number) => {
    // 2n - 1 equal parts: dash, gap, dash, gap, dash.
    const parts = 2 * n - 1;
    for (let k = 0; k < n; k++) {
      const t0 = (2 * k) / parts;
      const t1 = (2 * k + 1) / parts;
      out.push([ax + (bx - ax) * t0, ay + (by - ay) * t0, ax + (bx - ax) * t1, ay + (by - ay) * t1]);
    }
  };
  side(x0, y0, x1, y0);
  side(x1, y0, x1, y1);
  side(x1, y1, x0, y1);
  side(x0, y1, x0, y0);
  return out;
}

export type FilmGlyph =
  | { kind: 'circle'; x: number; y: number; r: number }
  | { kind: 'triangle'; points: Point[] }
  | { kind: 'square'; x: number; y: number; size: number };

/** The shape of a primary, centred on (cx, cy) and fitting a circle of radius `r`: ● red, ▲ yellow, ■ blue. */
export function filmGlyph(color: Primary, cx: number, cy: number, r: number): FilmGlyph {
  if (color === RED) return { kind: 'circle', x: cx, y: cy, r };
  if (color === YELLOW) {
    // Equilateral, point up, inscribed in the circle.
    const half = r * Math.cos(Math.PI / 6);
    return { kind: 'triangle', points: [[cx, cy - r], [cx + half, cy + r / 2], [cx - half, cy + r / 2]] };
  }
  if (color === BLUE) {
    const size = r * Math.SQRT2;
    return { kind: 'square', x: cx - size / 2, y: cy - size / 2, size };
  }
  throw new Error(`a film is of a primary, not ${color}`);
}

/** Radius of the white disc that holds the glyph, as a share of the pixel's width. */
export const FILM_DISC = 0.3;

export interface PeelFrame {
  /** Offset of the film, in pixel widths. */
  dx: number;
  dy: number;
  /** Rotation in degrees. */
  angle: number;
  scale: number;
  alpha: number;
}

/** How long the film takes to come off, in ms. */
export const FILM_PEEL_MS = 380;

/**
 * The tear (#98): the film lifts off the pixel and curls up and away while it fades. `t` is the progress from 0
 * (stuck on) to 1 (gone), clamped. With reduced motion there is no travel: it just fades.
 */
export function peelFrame(t: number, reduced = false): PeelFrame {
  const p = Math.min(1, Math.max(0, t));
  if (reduced) return { dx: 0, dy: 0, angle: 0, scale: 1, alpha: 1 - p };
  const lift = 1 - (1 - p) * (1 - p); // ease-out: it comes off fast, then drifts
  return { dx: 0.35 * lift, dy: 0 - 0.8 * lift, angle: 24 * lift, scale: 1 + 0.2 * lift, alpha: 1 - p * p };
}
