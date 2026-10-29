import { BLUE, RED, YELLOW, type Primary } from './colors';

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
