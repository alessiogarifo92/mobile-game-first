import { BLUE, BROWN, RED, YELLOW, missingPrimaries, type Primary } from './colors';

export type Point = readonly [number, number];

/**
 * A brown pixel is split into three wedges from its centre, one per primary at a fixed place: red upper-left,
 * yellow upper-right, blue at the bottom. A received primary fills its wedge, so a partly painted brown pixel shows
 * which colour is missing by position as well as by colour (#94). Polygons are in the pixel's own coordinates.
 */
export function brownWedges(x: number, y: number, w: number, h: number): Record<Primary, Point[]> {
  const c: Point = [x + w / 2, y + h / 2];
  const top: Point = [x + w / 2, y];
  // The other two dividers leave the centre 30° below the horizontal (120° apart from the vertical one).
  const side = y + h / 2 + (w / 2) * Math.tan(Math.PI / 6);
  const right: Point = [x + w, side];
  const left: Point = [x, side];
  return {
    [RED]: [c, left, [x, y], top],
    [YELLOW]: [c, top, [x + w, y], right],
    [BLUE]: [c, right, [x + w, y + h], [x, y + h], left],
  } as Record<Primary, Point[]>;
}

export interface MissingDot {
  color: Primary;
  x: number;
  y: number;
  r: number;
}

/**
 * Dots that mark the primaries a started mixed or brown pixel still needs (#149), in the pixel's own coordinates. A
 * brown pixel puts each dot in the empty wedge of its colour (red upper-left, yellow upper-right, blue bottom), so
 * colour and place say the same thing; a mixed pixel puts its one missing primary in the lower-right half, the part
 * the received colour has not filled. The radius never drops under 4 so a dot stays visible on small pixels.
 */
export function missingDots(target: number, paint: number, x: number, y: number, w: number, h: number): MissingDot[] {
  const missing = missingPrimaries(target, paint);
  const r = Math.max(Math.min(w, h) * 0.13, 4);
  const brown: Record<Primary, Point> = {
    [RED]: [x + w * 0.27, y + h * 0.3],
    [YELLOW]: [x + w * 0.73, y + h * 0.3],
    [BLUE]: [x + w * 0.5, y + h * 0.78],
  } as Record<Primary, Point>;
  return missing.map((color) => {
    const [cx, cy] = target === BROWN ? brown[color] : [x + w * 0.68, y + h * 0.68];
    return { color, x: cx, y: cy, r };
  });
}
