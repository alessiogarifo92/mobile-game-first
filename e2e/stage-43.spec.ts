import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 43 "Robot" (#268): the map of universe 5 shows stage 43 after level 420. Level 421 debuts the pair ice + film:
 * its card shows once, on screen, to a player who knows both halves; the other levels show no card and play to a win.
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

/** Plays the solver's solution of the open level to a win, and checks ice and films are all gone. */
async function playToWin(page: Page, id: number) {
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'ice')).toBe(0);
  expect(await mix(page, 'film')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 420 the map of universe 5 shows stage 43 with only level 421 playable', async ({ page }) => {
  await start(page, { unlocked: 421, completed: range(1, 420) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 430));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 421));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-43.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 421, the bolt, debuts ice + film: the pair card shows once on screen and the level plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 421, completed: range(1, 420), language: 'en' });
      await openLevel(page, 421);
      expect(await mix(page, 'levelId')).toBe(421);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'iceFilm');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} ice + film card at 421`);
      expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
      expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
      if (shots) await page.screenshot({ path: `${shots}/02-bullone-card-${tag}.png` });
      expect(await dismissTip(page)).toBe('iceFilm');
      await page.waitForTimeout(300);
      expect(await mix(page, 'tip')).toBeNull();
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips, KEY)).toContain('iceFilm');
      if (shots) await page.screenshot({ path: `${shots}/03-bullone-tela-${tag}.png` });
      await playToWin(page, 421);
    });
  });
}

test('level 422, the cog, keeps ice and films without showing the card again, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 422, completed: range(1, 421), seenTips: [...TIPS, 'iceFilm'] });
  await openLevel(page, 422);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-rotella.png` });
  await playToWin(page, 422);
});

test('level 430, the mega robot boss, opens its padlocks and plays to a win, finishing stage 43', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, { unlocked: 430, completed: range(1, 429), seenTips: [...TIPS, 'iceFilm'] });
  await openLevel(page, 430);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/05-robottone-boss.png` });
  await playToWin(page, 430);
  expect(await mix(page, 'locked')).toBe(0);
  if (shots) await page.screenshot({ path: `${shots}/06-robottone-vinto.png` });
});
