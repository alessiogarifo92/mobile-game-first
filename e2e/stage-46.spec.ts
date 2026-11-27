import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 46 "Cristalli" (#271): the map of universe 5 shows stage 46 after level 450. No new pair, so no card: the
 * quartz (451), the emerald (452, ice + film) and the geode (455, ice + tunnel with padlocks) play to a win; the boss
 * (460, the 16×16 golem, every padlock of the stage) fits on screen at 360×640 and plays to a win at both sizes.
 */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel', 'iceFilm', 'iceTunnel'];
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

test('after level 450 the map of universe 5 shows stage 46 with only level 451 playable', async ({ page }) => {
  await start(page, { unlocked: 451, completed: range(1, 450) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  // Stages 47 (#272) and 48 (#273) are on the map too, still locked.
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10], [46, 10], [47, 10], [48, 10], [49, 10], [50, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 500));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 451));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450, 460, 470, 480, 490, 500]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-46.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 451, the quartz, shows no card, fits the screen and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 451, completed: range(1, 450), language: 'en' });
      await openWithoutCard(page, 451);
      expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} quartz at 451`);
      if (shots) await page.screenshot({ path: `${shots}/02-quarzo-${tag}.png` });
      await playToWin(page, 451);
    });
  });
}

test('level 452, the emerald, brings ice and films back without a card and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 452, completed: range(1, 451) });
  await openWithoutCard(page, 452);
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/03-smeraldo.png` });
  await playToWin(page, 452);
});

test('level 455, the geode, keeps ice, the tunnel and padlocks without a card and plays to a win', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, { unlocked: 455, completed: range(1, 454) });
  await openWithoutCard(page, 455);
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-geode.png` });
  await playToWin(page, 455);
});

for (const size of SIZES) {
  test(`level 460, the golem boss (16×16), opens its padlocks and plays to a win at ${size.width}x${size.height}, finishing stage 46`, async ({ page }) => {
    // A long solution on a 16×16 board: about 4 minutes on the loaded CI runner (#272), 2.5 locally.
    test.setTimeout(360_000);
    await page.setViewportSize(size);
    const tag = `${size.width}x${size.height}`;
    await start(page, { unlocked: 460, completed: range(1, 459) });
    await openWithoutCard(page, 460);
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
    await checkOnScreen(page, `${tag} 16×16 golem at 460`);
    if (shots) await page.screenshot({ path: `${shots}/05-golem-boss-${tag}.png` });
    await playToWin(page, 460);
    if (shots) await page.screenshot({ path: `${shots}/06-golem-vinto-${tag}.png` });
  });
}
