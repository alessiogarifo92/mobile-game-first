import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 42 "Stelle" (#267): the map of universe 5 shows stage 42 after level 410. Brown and padlocks again, with films
 * and stones from universe 4: no card appears and the levels play to a win.
 */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];
const won = () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win';

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

/** Opens `id`, checks it has padlocks and no card, then plays the solver's solution to a win. */
async function playLevel(page: Page, id: number, shot?: string, beforePlay?: () => Promise<void>) {
  await openLevel(page, id);
  expect(await mix(page, 'levelId')).toBe(id);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  await beforePlay?.();
  if (shots && shot) await page.screenshot({ path: `${shots}/${shot}` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 410 the map of universe 5 shows stage 42 with only level 411 playable', async ({ page }) => {
  await start(page, { unlocked: 411, completed: range(1, 410) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  // Stages 43 (#268), 44 (#269), 45 (#270), 46 (#271), 47 (#272) and 48 (#273) are on the map too, still locked.
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10], [46, 10], [47, 10], [48, 10], [49, 10], [50, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 500));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 411));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450, 460, 470, 480, 490, 500]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-42.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 411, the twinkle star, keeps padlocks on brown, shows no card and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 411, completed: range(1, 410), language: 'en' });
      await playLevel(page, 411, size.width === 360 ? `02-stellina-${tag}.png` : undefined, () => checkOnScreen(page, `${tag} level 411`));
    });
  });
}

test('level 416, the telescope, brings brown, stones, padlocks and films together and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 416, completed: range(1, 415) });
  await playLevel(page, 416, '03-telescopio.png', async () => {
    expect(await mix<number>(page, 'stones')).toBeGreaterThan(0);
    expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  });
});

test('level 420, the starry sky boss, plays to a win and finishes stage 42', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, { unlocked: 420, completed: range(1, 419) });
  await playLevel(page, 420, '04-cielo-stellato-boss.png', async () => {
    expect(await mix<number>(page, 'stones')).toBeGreaterThan(0);
    expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  });
  expect(await mix(page, 'film')).toBe(0);
  if (shots) await page.screenshot({ path: `${shots}/05-cielo-stellato-vinto.png` });
});
