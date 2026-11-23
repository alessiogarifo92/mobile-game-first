import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 37 "Uccelli" (#242): the map shows stage 37 after level 360; tunnels and films are already known, so no card appears. */
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

test('after level 360 the map shows stage 37 with only level 361 playable', async ({ page }) => {
  await start(page, { unlocked: 361, completed: range(1, 360) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10], [35, 10], [36, 10], [37, 10], [38, 10], [39, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 390));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 360)).toEqual([361]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340, 350, 360, 370, 380, 390]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-37.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 361, the seagull, keeps a tunnel and films, shows no card and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 361, completed: range(1, 360), language: 'en' });
      await openLevel(page, 361);
      expect(await mix(page, 'levelId')).toBe(361);
      await page.waitForTimeout(800);
      expect(await mix(page, 'tip')).toBeNull();
      expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
      expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} level 361`);
      if (shots) await page.screenshot({ path: `${shots}/02-gabbiano-${tag}.png` });
      expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
      await waitSim(page, won);
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(361);
      if (shots) await page.screenshot({ path: `${shots}/03-gabbiano-vinto-${tag}.png` });
    });
  });
}

test('level 367, the cockatoo, keeps a tunnel and films on the board without a card, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 367, completed: range(1, 366) });
  await openLevel(page, 367);
  expect(await mix(page, 'levelId')).toBe(367);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-cacatua-galleria-pellicola.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(367);
});

test('level 370, the firebird boss, keeps a tunnel and films on the board and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 370, completed: range(1, 369) });
  await openLevel(page, 370);
  expect(await mix(page, 'levelId')).toBe(370);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/05-uccello-di-fuoco-boss.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(370);
});
