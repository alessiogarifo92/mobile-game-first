import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { PANEL_ARM_WAIT, checkOnScreen, mix, openLevel, play, shots, tap, waitScene, waitSim } from './helpers';

/**
 * Stage 40 "Arcobaleno" (#245): the map shows stage 40, the last of universe 4, after level 390; tunnels and padlocks
 * are already known, so no card appears. Winning the boss 400 finishes the universe and shows its party.
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

/** Opens `id`, checks it keeps a tunnel and padlocks without a card, then plays the solver's solution to a win. */
async function playLevel(page: Page, id: number, shot?: string, beforePlay?: () => Promise<void>) {
  await openLevel(page, id);
  expect(await mix(page, 'levelId')).toBe(id);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  await beforePlay?.();
  if (shots && shot) await page.screenshot({ path: `${shots}/${shot}` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 390 the map shows stage 40, the last of universe 4, with only level 391 playable', async ({ page }) => {
  await start(page, { unlocked: 391, completed: range(1, 390) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10], [35, 10], [36, 10], [37, 10], [38, 10], [39, 10], [40, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 400));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 390)).toEqual([391]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340, 350, 360, 370, 380, 390, 400]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-40.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 391, the rainbow over the hills, keeps a tunnel and padlocks, shows no card and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 391, completed: range(1, 390), language: 'en' });
      await playLevel(page, 391, `02-arcobaleno-colline-${tag}.png`, () => checkOnScreen(page, `${tag} level 391`));
      if (shots) await page.screenshot({ path: `${shots}/03-arcobaleno-vinto-${tag}.png` });
    });
  });
}

test('level 397, the rainbow sail, keeps a tunnel and padlocks on the board without a card, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 397, completed: range(1, 396) });
  await playLevel(page, 397, '04-vela-arcobaleno.png');
});

test('level 400, the final boss, plays to a win and finishes universe 4 with its party, its bucket style and universe 5 next', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, { unlocked: 400, completed: range(1, 399) });
  await playLevel(page, 400, '05-grande-arcobaleno-boss.png');
  expect(await mix(page, 'completedUniverse')).toBe(4);
  if (shots) await page.screenshot({ path: `${shots}/06-boss-vinto.png` });

  const buttons = await mix<{ next: { x: number; y: number } }>(page, 'winButtons');
  await page.waitForTimeout(PANEL_ARM_WAIT);
  await tap(page, buttons.next.x, buttons.next.y);
  await waitScene(page, 'universeEnd');
  expect(await mix(page, 'universe')).toBe(4);
  expect(await mix(page, 'next')).toBe(5); // universe 5 "Cosmo" opens (#265)
  await page.waitForFunction(() => (window as unknown as { __mix: { done: boolean } }).__mix.done);
  expect(await mix(page, 'newSkin')).toBe('bubbles');
  await checkOnScreen(page, 'universe 4 party');
  if (shots) await page.screenshot({ path: `${shots}/07-festa-universo-4.png` });
});
