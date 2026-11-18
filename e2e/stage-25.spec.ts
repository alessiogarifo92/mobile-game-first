import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 25 "Musica" (#203): the map shows the stage after level 240; level 241 debuts covered buckets and plays to a win. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover', 'lock'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after stage 24 the map of universe 3 adds stage 25 with only level 241 playable', async ({ page }) => {
  await start(page, { unlocked: 241, completed: range(1, 240) });
  expect(await mix(page, 'universe')).toBe(3);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.slice(0, 5).map((h) => [h.stage, h.count])).toEqual([[21, 10], [22, 10], [23, 10], [24, 10], [25, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  const mine = nodes.filter((n) => n.id <= 250);
  expect(mine.map((n) => n.id)).toEqual(range(201, 250));
  expect(mine.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(201, 241));
  expect(mine.filter((n) => n.boss).map((n) => n.id)).toEqual([210, 220, 230, 240, 250]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-25.png` });
});

test('level 241, the musical note, debuts covered buckets with their tip and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 241, completed: range(1, 240) });
  await openLevel(page, 241);
  expect(await mix(page, 'levelId')).toBe(241);
  expect(await mix<number>(page, 'covered')).toBeGreaterThan(0);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'covered');
  expect(await dismissTip(page)).toBe('covered');
  if (shots) await page.screenshot({ path: `${shots}/02-nota-tela.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(241);
  if (shots) await page.screenshot({ path: `${shots}/03-nota-vinta.png` });
});

test('level 242, the guitar, has covered buckets, a key and two locks and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 242, completed: range(1, 241), seenTips: [...TIPS, 'covered'] });
  await openLevel(page, 242);
  expect(await mix(page, 'levelId')).toBe(242);
  expect(await mix<number>(page, 'covered')).toBeGreaterThan(0);
  expect(await mix(page, 'locked')).toBe(2);
  expect(await dismissTip(page)).toBeNull();
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(242);
  if (shots) await page.screenshot({ path: `${shots}/04-chitarra-vinta.png` });
});
