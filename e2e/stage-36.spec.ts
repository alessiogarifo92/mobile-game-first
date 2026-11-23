import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 36 "Nuvole" (#241): the map shows stage 36 after level 350; the tunnel is already known, so no card appears. */
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

test('after level 350 the map shows stage 36 with only level 351 playable', async ({ page }) => {
  await start(page, { unlocked: 351, completed: range(1, 350) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10], [35, 10], [36, 10], [37, 10], [38, 10], [39, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 390));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 350)).toEqual([351]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340, 350, 360, 370, 380, 390]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-36.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 351, the fluffy cloud, keeps a tunnel, shows no card and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 351, completed: range(1, 350), language: 'en' });
      await openLevel(page, 351);
      expect(await mix(page, 'levelId')).toBe(351);
      await page.waitForTimeout(800);
      expect(await mix(page, 'tip')).toBeNull();
      expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
      await checkOnScreen(page, `${tag} level 351`);
      if (shots) await page.screenshot({ path: `${shots}/02-nuvoletta-${tag}.png` });
      expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
      await waitSim(page, won);
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(351);
      if (shots) await page.screenshot({ path: `${shots}/03-nuvoletta-vinto-${tag}.png` });
    });
  });
}

test('level 357, the thunderstorm, keeps a tunnel and films on the board without a card, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 357, completed: range(1, 356) });
  await openLevel(page, 357);
  expect(await mix(page, 'levelId')).toBe(357);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-temporale-galleria.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(357);
});

test('level 360, the sky castle boss, keeps a tunnel and films on the board and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 360, completed: range(1, 359) });
  await openLevel(page, 360);
  expect(await mix(page, 'levelId')).toBe(360);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/05-castello-boss.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(360);
});
