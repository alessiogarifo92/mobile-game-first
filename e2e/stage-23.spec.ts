import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 23 "Mercato" (#201): the map shows the stage after level 220 and level 221 plays to a win with its key, locks and stones. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover', 'lock'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after stage 22 the map of universe 3 adds stage 23 with only level 221 playable', async ({ page }) => {
  await start(page, { unlocked: 221, completed: range(1, 220) });
  expect(await mix(page, 'universe')).toBe(3);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.slice(0, 3).map((h) => [h.stage, h.count])).toEqual([[21, 10], [22, 10], [23, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  const mine = nodes.filter((n) => n.id <= 230);
  expect(mine.map((n) => n.id)).toEqual(range(201, 230));
  expect(mine.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(201, 221));
  expect(mine.filter((n) => n.boss).map((n) => n.id)).toEqual([210, 220, 230]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-23.png` });
});

test('level 221, the melon slice, has a key, two locks and stones and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 221, completed: range(1, 220) });
  await openLevel(page, 221);
  expect(await mix(page, 'levelId')).toBe(221);
  expect(await mix(page, 'locked')).toBe(2);
  expect(await dismissTip(page)).toBeNull();
  if (shots) await page.screenshot({ path: `${shots}/02-anguria-tela.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(221);
  if (shots) await page.screenshot({ path: `${shots}/03-anguria-vinta.png` });
});
