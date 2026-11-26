import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 48 "Galassia" (#273): the map of universe 5 shows stage 48 after level 470. No new pair, so no card: the
 * spiral (471, padlocks), the Milky Way (473, hidden pixels + films with padlocks) and Orion (476, ice + tunnel) play
 * to a win; the boss (480, the 16×16 Andromeda, every padlock of the stage) fits on screen at 360×640 and plays to a
 * win at both sizes.
 */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel', 'iceFilm', 'iceTunnel', 'hiddenFilm'];
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

/** Plays the solver's solution of the open level to a win, and checks every obstacle is gone and the save records it. */
async function playToWin(page: Page, id: number) {
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await mix(page, 'ice')).toBe(0);
  expect(await mix(page, 'film')).toBe(0);
  expect(await mix(page, 'hidden')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 470 the map of universe 5 shows stage 48 with only level 471 playable', async ({ page }) => {
  await start(page, { unlocked: 471, completed: range(1, 470) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10], [46, 10], [47, 10], [48, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 480));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 471));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450, 460, 470, 480]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-48.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 471, the spiral, shows no card, fits the screen and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 471, completed: range(1, 470), language: 'en' });
      await openWithoutCard(page, 471);
      expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} spiral at 471`);
      if (shots) await page.screenshot({ path: `${shots}/02-spirale-${tag}.png` });
      await playToWin(page, 471);
    });
  });
}

test('level 473, the Milky Way, brings hidden pixels and films with padlocks back without a card and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 473, completed: range(1, 472) });
  await openWithoutCard(page, 473);
  expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/03-via-lattea.png` });
  await playToWin(page, 473);
});

test('level 476, Orion, brings ice and the tunnel back without a card and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 476, completed: range(1, 475) });
  await openWithoutCard(page, 476);
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-orione.png` });
  await playToWin(page, 476);
});

for (const size of SIZES) {
  test(`level 480, the Andromeda boss (16×16), opens its padlocks and plays to a win at ${size.width}x${size.height}, finishing stage 48`, async ({ page }) => {
    // A long solution on a 16×16 board: the bosses 460 and 470 take about 4 minutes on the loaded CI runner.
    test.setTimeout(360_000);
    await page.setViewportSize(size);
    const tag = `${size.width}x${size.height}`;
    await start(page, { unlocked: 480, completed: range(1, 479) });
    await openWithoutCard(page, 480);
    expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    await checkOnScreen(page, `${tag} 16×16 Andromeda at 480`);
    if (shots) await page.screenshot({ path: `${shots}/05-andromeda-boss-${tag}.png` });
    await playToWin(page, 480);
    if (shots) await page.screenshot({ path: `${shots}/06-andromeda-vinta-${tag}.png` });
  });
}
