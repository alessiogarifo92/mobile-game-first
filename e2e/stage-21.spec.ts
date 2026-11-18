import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 21 "Stazione" (#199): universe 3 opens after level 200; level 201 debuts locks and keys and plays to a win. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after universe 2 the map opens on universe 3, stage 21 first, with only level 201 playable', async ({ page }) => {
  await start(page, { unlocked: 201, completed: range(1, 200) });
  expect(await mix(page, 'universe')).toBe(3);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.slice(0, 2).map((h) => [h.stage, h.count])).toEqual([[21, 10], [22, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  const mine = nodes.filter((n) => n.id <= 220);
  expect(mine.map((n) => n.id)).toEqual(range(201, 220));
  expect(mine.filter((n) => n.unlocked).map((n) => n.id)).toEqual([201]);
  expect(mine.filter((n) => n.boss).map((n) => n.id)).toEqual([210, 220]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-universo-3.png` });
});

test('level 201, the ticket, debuts locks and keys: the tip explains them and the level plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 201, completed: range(1, 200) });
  await openLevel(page, 201);
  expect(await mix(page, 'levelId')).toBe(201);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'lock');
  expect(await mix(page, 'locked')).toBe(2);
  if (shots) await page.screenshot({ path: `${shots}/02-biglietto-suggerimento.png` });

  expect(await dismissTip(page)).toBe('lock');
  if (shots) await page.screenshot({ path: `${shots}/03-biglietto-tela.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(201);
  if (shots) await page.screenshot({ path: `${shots}/04-biglietto-vinto.png` });
});
