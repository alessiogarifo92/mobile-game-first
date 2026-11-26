import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { PANEL_ARM_WAIT, checkOnScreen, mix, openLevel, play, shots, tap, waitScene, waitSim } from './helpers';

/**
 * Stage 41 "Pianeti" (#265): universe 5 "Cosmo" opens after level 400. Brown and padlocks are already known, so no
 * card appears; every level keeps padlocks on brown pixels and plays to a win.
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

test('winning level 400 opens universe 5: the party leads to its map, with only level 401 playable', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, { unlocked: 400, completed: range(1, 399) });
  await openLevel(page, 400);
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'completedUniverse')).toBe(4);

  const buttons = await mix<{ next: { x: number; y: number } }>(page, 'winButtons');
  await page.waitForTimeout(PANEL_ARM_WAIT);
  await tap(page, buttons.next.x, buttons.next.y);
  await waitScene(page, 'universeEnd');
  expect(await mix(page, 'next')).toBe(5);
  await page.waitForFunction(() => (window as unknown as { __mix: { done: boolean } }).__mix.done);
  if (shots) await page.screenshot({ path: `${shots}/01-festa-universo-4-verso-cosmo.png` });

  const go = await mix<{ x: number; y: number }>(page, 'goButton');
  await tap(page, go.x, go.y);
  await waitScene(page, 'menu');
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  // Stages 42 (#267), 43 (#268), 44 (#269), 45 (#270), 46 (#271) and 47 (#272) are on the map too, still locked.
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10], [46, 10], [47, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 470));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([401]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450, 460, 470]);
  if (shots) await page.screenshot({ path: `${shots}/02-mappa-universo-5.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('the universe selector shows five universes, all open, on screen', async ({ page }) => {
      await start(page, { unlocked: 401, completed: range(1, 400), language: 'en' });
      const button = await mix<{ x: number; y: number }>(page, 'universeButton');
      await tap(page, button.x, button.y);
      await waitScene(page, 'universes');
      const cards = await mix<{ id: number; open: boolean; done: number; total: number; x: number; y: number }[]>(page, 'cards');
      expect(cards.map((c) => [c.id, c.open, c.done, c.total])).toEqual([[1, true, 100, 100], [2, true, 100, 100], [3, true, 100, 100], [4, true, 100, 100], [5, true, 0, 70]]);
      await checkOnScreen(page, `${tag} selector with five universes`);
      if (shots) await page.screenshot({ path: `${shots}/03-selettore-5-universi-${tag}.png` });
      await tap(page, cards[4]!.x, cards[4]!.y);
      await waitScene(page, 'menu');
      expect(await mix(page, 'universe')).toBe(5);
    });

    test('level 401, Mars, keeps padlocks on brown, shows no card and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 401, completed: range(1, 400), language: 'en' });
      await playLevel(page, 401, `04-marte-${tag}.png`, () => checkOnScreen(page, `${tag} level 401`));
      if (shots) await page.screenshot({ path: `${shots}/05-marte-vinto-${tag}.png` });
    });
  });
}

test('level 410, the solar system boss, plays to a win and finishes stage 41', async ({ page }) => {
  test.setTimeout(240_000);
  await start(page, { unlocked: 410, completed: range(1, 409) });
  await playLevel(page, 410, '06-sistema-solare-boss.png');
  if (shots) await page.screenshot({ path: `${shots}/07-sistema-solare-vinto.png` });
});
