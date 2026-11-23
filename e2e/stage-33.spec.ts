import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 33 "Abissi" (#238): the map shows stage 33 after level 320, and levels play to a win with films, keys and locks on the board. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after level 320 the map shows stage 33 with only level 321 playable', async ({ page }) => {
  await start(page, { unlocked: 321, completed: range(1, 320) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10], [35, 10], [36, 10], [37, 10], [38, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 380));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toContain(321);
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 321)).toEqual([]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340, 350, 360, 370, 380]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-33.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 321, the sunken anchor, shows films on screen and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 321, completed: range(1, 320) });
      await openLevel(page, 321);
      expect(await mix(page, 'levelId')).toBe(321);
      await page.waitForTimeout(800);
      expect(await mix(page, 'tip')).toBeNull();
      expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} anchor at 321`);
      if (shots) await page.screenshot({ path: `${shots}/02-ancora-${tag}.png` });
      expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
      expect(await mix(page, 'film')).toBe(0);
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(321);
      if (shots) await page.screenshot({ path: `${shots}/03-ancora-vinto-${tag}.png` });
    });
  });
}

test('level 330, the kraken boss, keeps films on the board and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 330, completed: range(1, 329) });
  await openLevel(page, 330);
  expect(await mix(page, 'levelId')).toBe(330);
  await page.waitForTimeout(800);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-kraken-boss.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(330);
});
