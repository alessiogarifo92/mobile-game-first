import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 47 "Mito" (#272): the map of universe 5 shows stage 47 after level 460. Level 461 debuts the pair hidden
 * pixels + film: its card shows once, on screen, to a player who knows both halves; the other levels show no card and
 * play to a win. The boss (470, the 16×16 hydra) fits on screen at 360×640 and plays to a win at both sizes.
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

/** Plays the solver's solution of the open level to a win, and checks every hidden pixel, film and padlock is gone. */
async function playToWin(page: Page, id: number) {
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'hidden')).toBe(0);
  expect(await mix(page, 'film')).toBe(0);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 460 the map of universe 5 shows stage 47 with only level 461 playable', async ({ page }) => {
  await start(page, { unlocked: 461, completed: range(1, 460) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10], [46, 10], [47, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 470));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 461));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450, 460, 470]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-47.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 461, the lyre, debuts hidden + film: the pair card shows once on screen and the level plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 461, completed: range(1, 460), language: 'en' });
      await openLevel(page, 461);
      expect(await mix(page, 'levelId')).toBe(461);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'hiddenFilm');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} hidden + film card at 461`);
      expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
      expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
      if (shots) await page.screenshot({ path: `${shots}/02-lira-card-${tag}.png` });
      expect(await dismissTip(page)).toBe('hiddenFilm');
      await page.waitForTimeout(300);
      expect(await mix(page, 'tip')).toBeNull();
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips, KEY)).toContain('hiddenFilm');
      if (shots) await page.screenshot({ path: `${shots}/03-lira-tela-${tag}.png` });
      await playToWin(page, 461);
    });
  });
}

test('level 462, the amphora, keeps hidden pixels and films with padlocks, without the card again, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 462, completed: range(1, 461), seenTips: [...TIPS, 'hiddenFilm'] });
  await openWithoutCard(page, 462);
  expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-anfora.png` });
  await playToWin(page, 462);
});

for (const size of SIZES) {
  test(`level 470, the hydra boss (16×16), opens its padlocks and plays to a win at ${size.width}x${size.height}, finishing stage 47`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(size);
    const tag = `${size.width}x${size.height}`;
    await start(page, { unlocked: 470, completed: range(1, 469), seenTips: [...TIPS, 'hiddenFilm'] });
    await openWithoutCard(page, 470);
    expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    await checkOnScreen(page, `${tag} 16×16 hydra at 470`);
    if (shots) await page.screenshot({ path: `${shots}/05-idra-boss-${tag}.png` });
    await playToWin(page, 470);
    if (shots) await page.screenshot({ path: `${shots}/06-idra-vinta-${tag}.png` });
  });
}
