import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 34 "Isola" (#239): the map shows stage 34 after level 330, and levels play to a win with films, stones and covered buckets on the board. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after level 330 the map shows stage 34 with only level 331 playable', async ({ page }) => {
  await start(page, { unlocked: 331, completed: range(1, 330) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 340));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toContain(331);
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 331)).toEqual([]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-34.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 331, the coconut palm, shows films on screen and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 331, completed: range(1, 330) });
      await openLevel(page, 331);
      expect(await mix(page, 'levelId')).toBe(331);
      await page.waitForTimeout(800);
      expect(await mix(page, 'tip')).toBeNull();
      expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} palm at 331`);
      if (shots) await page.screenshot({ path: `${shots}/02-palma-${tag}.png` });
      expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
      expect(await mix(page, 'film')).toBe(0);
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(331);
      if (shots) await page.screenshot({ path: `${shots}/03-palma-vinto-${tag}.png` });
    });
  });
}

test('level 340, the island boss, keeps films on the board and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 340, completed: range(1, 339) });
  await openLevel(page, 340);
  expect(await mix(page, 'levelId')).toBe(340);
  await page.waitForTimeout(800);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-isola-boss.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(340);
});
