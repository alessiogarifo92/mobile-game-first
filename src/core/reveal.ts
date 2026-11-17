/**
 * The moment a hidden "?" pixel shows its colour (#152, direction A "Tessera girata", docs/design/152-rivelazione.md).
 * The cover turns over like a card, the face opens full of the revealed colour with an ink rim, then settles into the
 * pixel still to paint. With reduced motion nothing moves: the colour and the rim hold still for a while, then cut.
 */

/** Whole reveal with motion. */
export const PIXEL_REVEAL_MS = 700;
/** Whole reveal with reduced motion: a static signal, held long enough to be seen. */
export const PIXEL_REVEAL_REDUCED_MS = 1200;
/** Share of the reveal spent squashing the cover away. */
export const COVER_PHASE = 0.35;
/** Share of the reveal by which the face is fully open. */
export const FACE_PHASE = 0.6;

/** What to draw at one instant of a reveal. Widths are horizontal scales (0–1), the rest opacities (0–1). */
export interface RevealFrame {
  /** Width of the cover with its "?", while it turns away. */
  cover: number;
  /** Width of the face full of the revealed colour. */
  face: number;
  /** Opacity of the revealed colour over the face. */
  fill: number;
  /** Opacity of the ink rim around the cell. */
  ring: number;
  /** The reveal is over: draw the pixel as usual. */
  done: boolean;
}

export function pixelRevealMs(reduced: boolean): number {
  return reduced ? PIXEL_REVEAL_REDUCED_MS : PIXEL_REVEAL_MS;
}

const DONE: RevealFrame = { cover: 0, face: 1, fill: 0, ring: 0, done: true };

/** The frame `elapsed` ms after the reveal started. */
export function pixelRevealFrame(elapsed: number, reduced: boolean): RevealFrame {
  const total = pixelRevealMs(reduced);
  if (elapsed >= total) return DONE;
  if (reduced) return { cover: 0, face: 1, fill: 1, ring: 1, done: false };
  const p = Math.max(elapsed, 0) / total;
  if (p < COVER_PHASE) return { cover: Math.cos((p / COVER_PHASE) * (Math.PI / 2)), face: 0, fill: 1, ring: 0, done: false };
  const open = Math.min((p - COVER_PHASE) / (FACE_PHASE - COVER_PHASE), 1);
  const fade = p < FACE_PHASE ? 1 : 1 - (p - FACE_PHASE) / (1 - FACE_PHASE);
  return { cover: 0, face: Math.sin(open * (Math.PI / 2)), fill: fade, ring: fade, done: false };
}

/** Cells of `starts` (cell → start time) whose reveal is still running at `now`, in ascending order. */
export function runningReveals(starts: ReadonlyMap<number, number>, now: number, reduced: boolean): number[] {
  return [...starts].filter(([, at]) => now - at < pixelRevealMs(reduced)).map(([cell]) => cell).sort((a, b) => a - b);
}
