import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 44 "Laboratorio" (#269): the map of universe 5 shows stage 44 after level 430. No new pair, so no card: the
 * test tube (431), the magnet (433, ice + film) and the boss (440, every padlock of the stage) play to a win.
 */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel', 'iceFilm'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];
const won = () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win';

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

/** Opens a level, checks no card shows, and returns once the board is ready. */
async function openWithoutCard(page: Page, id: number) {
  await openLevel(page, id);
  expect(await mix(page, 'levelId')).toBe(id);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
}

/** Plays the solver's solution of the open level to a win, and checks the save records it. */
async function playToWin(page: Page, id: number) {
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await mix(page, 'ice')).toBe(0);
  expect(await mix(page, 'film')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 430 the map of universe 5 shows stage 44 with only level 431 playable', async ({ page }) => {
  await start(page, { unlocked: 431, completed: range(1, 430) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  // Stage 45 (#270) is on the map too, still locked.
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 450));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 431));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-44.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 431, the test tube, shows no card, fits the screen and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 431, completed: range(1, 430), language: 'en' });
      await openWithoutCard(page, 431);
      expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} test tube at 431`);
      if (shots) await page.screenshot({ path: `${shots}/02-provetta-${tag}.png` });
      await playToWin(page, 431);
    });
  });
}

test('level 433, the magnet, brings ice and films back without a card and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 433, completed: range(1, 432) });
  await openWithoutCard(page, 433);
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/03-magnete.png` });
  await playToWin(page, 433);
});

test('level 440, the experiment boss, opens its padlocks and plays to a win, finishing stage 44', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, { unlocked: 440, completed: range(1, 439) });
  await openWithoutCard(page, 440);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-esperimento-boss.png` });
  await playToWin(page, 440);
  if (shots) await page.screenshot({ path: `${shots}/05-esperimento-vinto.png` });
});
