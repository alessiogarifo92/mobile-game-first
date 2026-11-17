import { describe, expect, it } from 'vitest';
import {
  COVER_PHASE,
  FACE_PHASE,
  PIXEL_REVEAL_MS,
  PIXEL_REVEAL_REDUCED_MS,
  pixelRevealFrame,
  pixelRevealMs,
  runningReveals,
} from '../src/core/reveal';

const at = (share: number) => pixelRevealFrame(share * PIXEL_REVEAL_MS, false);

describe('pixelRevealMs', () => {
  it('holds the static signal longer than the animation lasts', () => {
    expect(pixelRevealMs(false)).toBe(PIXEL_REVEAL_MS);
    expect(pixelRevealMs(true)).toBe(PIXEL_REVEAL_REDUCED_MS);
    expect(PIXEL_REVEAL_REDUCED_MS).toBeGreaterThan(PIXEL_REVEAL_MS);
    // Both last long enough to be noticed (the old pop lasted 300 ms and went unseen).
    expect(PIXEL_REVEAL_MS).toBeGreaterThanOrEqual(600);
  });
});

describe('pixelRevealFrame with motion', () => {
  it('starts on the full cover, with no colour shown yet', () => {
    expect(at(0)).toEqual({ cover: 1, face: 0, fill: 1, ring: 0, done: false });
  });

  it('treats a start in the future as the first frame', () => {
    expect(pixelRevealFrame(-50, false)).toEqual(at(0));
  });

  it('squashes the cover away, narrowing all the way', () => {
    const widths = [0, 0.1, 0.2, 0.3].map((s) => at(s).cover);
    for (let k = 1; k < widths.length; k++) expect(widths[k]!).toBeLessThan(widths[k - 1]!);
    expect(at(COVER_PHASE - 0.001).cover).toBeLessThan(0.01);
    expect(at(0.2).face).toBe(0);
  });

  it('then opens the face full of colour, with the ink rim', () => {
    const half = at((COVER_PHASE + FACE_PHASE) / 2);
    expect(half.cover).toBe(0);
    expect(half.face).toBeGreaterThan(0);
    expect(half.face).toBeLessThan(1);
    expect(half.fill).toBe(1);
    expect(half.ring).toBe(1);
    expect(at(FACE_PHASE).face).toBeCloseTo(1);
  });

  it('settles into the pixel to paint: the colour and the rim fade out', () => {
    const late = at(0.8);
    expect(late.face).toBe(1);
    expect(late.fill).toBeCloseTo(0.5);
    expect(late.ring).toBeCloseTo(late.fill);
    expect(at(0.99).fill).toBeLessThan(0.05);
    expect(at(0.99).done).toBe(false);
  });

  it('is done at the end', () => {
    expect(at(1)).toEqual({ cover: 0, face: 1, fill: 0, ring: 0, done: true });
    expect(pixelRevealFrame(10_000, false).done).toBe(true);
  });
});

describe('pixelRevealFrame with reduced motion', () => {
  it('never moves: the colour and the rim hold still from the first frame', () => {
    for (const ms of [0, 1, 300, 700, PIXEL_REVEAL_REDUCED_MS - 1]) {
      expect(pixelRevealFrame(ms, true)).toEqual({ cover: 0, face: 1, fill: 1, ring: 1, done: false });
    }
  });

  it('cuts to the pixel to paint once the hold is over', () => {
    expect(pixelRevealFrame(PIXEL_REVEAL_REDUCED_MS, true)).toEqual({ cover: 0, face: 1, fill: 0, ring: 0, done: true });
  });
});

describe('runningReveals', () => {
  const starts = new Map([[7, 1000], [2, 1500], [9, 0]]);

  it('lists the cells still revealing, in order', () => {
    expect(runningReveals(starts, 1600, false)).toEqual([2, 7]);
  });

  it('drops a reveal the moment it is over', () => {
    expect(runningReveals(starts, 1000 + PIXEL_REVEAL_MS, false)).toEqual([2]);
    expect(runningReveals(starts, 1500 + PIXEL_REVEAL_MS, false)).toEqual([]);
  });

  it('keeps reveals longer with reduced motion', () => {
    expect(runningReveals(starts, 1000 + PIXEL_REVEAL_MS, true)).toEqual([2, 7]);
  });

  it('is empty with no reveals', () => {
    expect(runningReveals(new Map(), 0, false)).toEqual([]);
  });
});
