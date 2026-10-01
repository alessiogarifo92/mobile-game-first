/** Primary paints are bit flags so a pixel's paint state is the OR of the primaries it received. */
export const RED = 1;
export const YELLOW = 2;
export const BLUE = 4;

export type Primary = typeof RED | typeof YELLOW | typeof BLUE;
export const PRIMARIES: readonly Primary[] = [RED, YELLOW, BLUE];

export const ORANGE = RED | YELLOW;
export const GREEN = YELLOW | BLUE;
export const PURPLE = RED | BLUE;

/** Single-character codes used by level images. `.` means "no pixel". */
export const COLOR_CODES: Record<string, number> = {
  R: RED,
  Y: YELLOW,
  B: BLUE,
  O: ORANGE,
  G: GREEN,
  P: PURPLE,
};

export function isPrimary(value: number): value is Primary {
  return value === RED || value === YELLOW || value === BLUE;
}

/** True when `color` is one of the primaries a target is made of. */
export function containsPrimary(target: number, color: Primary): boolean {
  return (target & color) !== 0;
}

/** A pixel accepts a primary when its target needs it and it has not received it yet. */
export function accepts(target: number, paint: number, color: Primary): boolean {
  return target !== 0 && containsPrimary(target, color) && (paint & color) === 0;
}

export function isComplete(target: number, paint: number): boolean {
  return target === 0 || paint === target;
}

/** Primaries that make up a target (or paint) mask, in R, Y, B order. */
export function primariesOf(mask: number): Primary[] {
  return PRIMARIES.filter((p) => (mask & p) !== 0);
}

export function codeOf(mask: number): string {
  const entry = Object.entries(COLOR_CODES).find(([, v]) => v === mask);
  return entry ? entry[0] : '.';
}
