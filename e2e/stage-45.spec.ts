import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 45 "Sogni" (#270): the map of universe 5 shows stage 45 after level 440. Level 441 debuts the pair ice + tunnel:
 * its card shows once, on screen, to a player who knows both halves; the other levels show no card and play to a win.
 * Levels 449 and 450 are the first 16×16 pictures: they fit on screen at 360×640.
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

/** Plays the solver's solution of the open level to a win, and checks the ice is all gone. */
async function playToWin(page: Page, id: number) {
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'ice')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 440 the map of universe 5 shows stage 45 with only level 441 playable', async ({ page }) => {
  await start(page, { unlocked: 441, completed: range(1, 440) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 450));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 441));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-45.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 441, the pillow, debuts ice + tunnel: the pair card shows once on screen and the level plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 441, completed: range(1, 440), language: 'en' });
      await openLevel(page, 441);
      expect(await mix(page, 'levelId')).toBe(441);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'iceTunnel');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} ice + tunnel card at 441`);
      expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
      expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
      if (shots) await page.screenshot({ path: `${shots}/02-cuscino-card-${tag}.png` });
      expect(await dismissTip(page)).toBe('iceTunnel');
      await page.waitForTimeout(300);
      expect(await mix(page, 'tip')).toBeNull();
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips, KEY)).toContain('iceTunnel');
      if (shots) await page.screenshot({ path: `${shots}/03-cuscino-tela-${tag}.png` });
      await playToWin(page, 441);
    });

    test('level 449, the castle, is a 16-wide picture (16×15) that fits on screen with its tunnel', async ({ page }) => {
      await start(page, { unlocked: 449, completed: range(1, 448), seenTips: [...TIPS, 'iceTunnel'] });
      await openLevel(page, 449);
      await page.waitForTimeout(800);
      expect(await mix(page, 'tip')).toBeNull();
      expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} 16-wide castle at 449`);
      if (shots) await page.screenshot({ path: `${shots}/04-castello-${tag}.png` });
    });
  });
}

test('level 442, the sheep, keeps ice and the tunnel without showing the card again, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 442, completed: range(1, 441), seenTips: [...TIPS, 'iceTunnel'] });
  await openLevel(page, 442);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/05-pecorella.png` });
  await playToWin(page, 442);
});

for (const size of SIZES) {
  test(`level 450, the dreamer boss (16×16), opens its padlocks and plays to a win at ${size.width}x${size.height}, finishing stage 45`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize(size);
    const tag = `${size.width}x${size.height}`;
    await start(page, { unlocked: 450, completed: range(1, 449), seenTips: [...TIPS, 'iceTunnel'] });
    await openLevel(page, 450);
    await page.waitForTimeout(800);
    expect(await mix(page, 'tip')).toBeNull();
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    await checkOnScreen(page, `${tag} 16×16 dreamer at 450`);
    if (shots) await page.screenshot({ path: `${shots}/06-sognatore-boss-${tag}.png` });
    await playToWin(page, 450);
    expect(await mix(page, 'locked')).toBe(0);
    if (shots) await page.screenshot({ path: `${shots}/07-sognatore-vinto-${tag}.png` });
  });
}
