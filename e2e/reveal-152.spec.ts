import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, waitScene } from './helpers';

/**
 * A hidden "?" pixel turns over when it is revealed (#152, finding F8 of the playtest of #69, docs/design/152-rivelazione.md):
 * the cover squashes away, the face opens full of the revealed colour with an ink rim, then settles into the pixel to
 * paint. With reduced motion nothing squashes: the colour and the rim hold still, long enough to be seen.
 * A sampler in the page records `__mix.pixelReveal` on every frame while a reveal runs, so the check does not depend on
 * catching one instant. With EVIDENCE set, each case leaves a screenshot in docs/test-evidence/152-rivelazione.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE;
const DIR = 'docs/test-evidence/152-rivelazione';
/** Level 51: the first hidden pixels (two). */
const HIDDEN_DEBUT = 51;

interface Frame { cover: number; face: number; fill: number; ring: number; done: boolean }
interface Sample { at: number; running: number[]; reduced: boolean; frame: Frame | null }

async function start(page: Page) {
  const value = { sound: false, language: 'it', seenTips: ALL_TIPS, unlocked: HIDDEN_DEBUT, completed: Array.from({ length: HIDDEN_DEBUT - 1 }, (_, i) => i + 1) };
  await page.addInitScript(([key, v]) => localStorage.setItem(key, v), [KEY, JSON.stringify(value)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, HIDDEN_DEBUT);
  // Record every published reveal state while one runs.
  await page.evaluate(() => {
    const w = window as unknown as { __revealSamples: unknown[]; __mix: { pixelReveal?: { running: number[]; reduced: boolean; frame: unknown } } };
    w.__revealSamples = [];
    const tick = () => {
      const r = w.__mix.pixelReveal;
      if (r && r.running.length > 0) w.__revealSamples.push({ at: performance.now(), running: r.running, reduced: r.reduced, frame: r.frame });
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
}

/** Plays the solver's line until the first hidden pixel has turned over, and lets that reveal finish. */
async function playUntilReveal(page: Page, name: string): Promise<void> {
  const hidden = await mix<number>(page, 'hidden');
  expect(hidden).toBe(2);
  expect(await mix<{ started: number }>(page, 'pixelReveal')).toMatchObject({ started: 0, running: [], frame: null });
  const solution = await mix<Move[]>(page, 'solution');
  // One watcher for the whole line: the screenshot is taken the moment the first reveal starts.
  const shot = evidence
    ? page.waitForFunction(() => ((window as unknown as { __mix: { pixelReveal: { running: number[] } } }).__mix.pixelReveal.running.length > 0), null, { timeout: 60_000 })
      .then(() => page.screenshot({ path: `${DIR}/${name}.png` }))
    : null;
  for (const move of solution) {
    await play(page, [move]);
    if ((await mix<{ started: number }>(page, 'pixelReveal')).started > 0) {
      await shot;
      break;
    }
  }
  expect(await mix<number>(page, 'hidden')).toBeLessThan(hidden);
  // Let the reveal finish.
  await page.waitForFunction(() => (window as unknown as { __mix: { pixelReveal: { running: number[] } } }).__mix.pixelReveal.running.length === 0);
}

const samples = (page: Page) => page.evaluate(() => (window as unknown as { __revealSamples: Sample[] }).__revealSamples);

test.use({ viewport: { width: 360, height: 640 } });

test('a revealed "?" pixel turns over and shows its colour with an ink rim', async ({ page }) => {
  test.setTimeout(120_000);
  await start(page);
  await playUntilReveal(page, '01-rivelazione-animata');

  const seen = await samples(page);
  expect(seen.length).toBeGreaterThan(2);
  expect(seen.every((s) => s.reduced === false && s.frame !== null)).toBe(true);
  // The cover squashes away, then the face shows the colour with the rim.
  expect(seen.some((s) => s.frame!.cover > 0 && s.frame!.cover < 1)).toBe(true);
  expect(seen.some((s) => s.frame!.cover === 0 && s.frame!.face > 0 && s.frame!.fill > 0.5 && s.frame!.ring > 0.5)).toBe(true);
  const revealed = await mix<{ started: number }>(page, 'pixelReveal');
  expect(revealed.started).toBeGreaterThanOrEqual(1);
});

test.describe('with reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('the revealed colour and rim hold still, long enough to be seen', async ({ page }) => {
    test.setTimeout(120_000);
    await start(page);
    await playUntilReveal(page, '02-rivelazione-movimento-ridotto');

    const seen = await samples(page);
    expect(seen.length).toBeGreaterThan(2);
    // Nothing squashes or fades: every recorded frame is the full colour with the rim.
    for (const s of seen) {
      expect(s.reduced).toBe(true);
      expect(s.frame).toEqual({ cover: 0, face: 1, fill: 1, ring: 1, done: false });
    }
    // The static signal stays up for most of a second (it is meant to last 1.2 s).
    const cell = seen[0]!.running[0]!;
    const span = seen.filter((s) => s.running.includes(cell));
    expect(span.at(-1)!.at - span[0]!.at).toBeGreaterThan(800);
  });
});
