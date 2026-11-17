import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 22 "Porto" (#200): the map shows the stage after level 210 and level 211 plays to a win with its key and locks. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover', 'lock'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after stage 21 the map of universe 3 adds stage 22 with only level 211 playable', async ({ page }) => {
  await start(page, { unlocked: 211, completed: range(1, 210) });
  expect(await mix(page, 'universe')).toBe(3);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[21, 10], [22, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(201, 220));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(201, 211));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([210, 220]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-22.png` });
});

test('level 211, the anchor, has a key and two locks and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 211, completed: range(1, 210) });
  await openLevel(page, 211);
  expect(await mix(page, 'levelId')).toBe(211);
  expect(await mix(page, 'locked')).toBe(2);
  expect(await dismissTip(page)).toBeNull();
  if (shots) await page.screenshot({ path: `${shots}/02-ancora-tela.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(211);
  if (shots) await page.screenshot({ path: `${shots}/03-ancora-vinta.png` });
});
