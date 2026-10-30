import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 17 "Autunno" (#127): a player at level 161 plays it to a win, with brown pixels and stones on the canvas. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('level 161, the maple leaf that opens the autumn, plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 161, completed: range(1, 160) });
  await openLevel(page, 161);
  expect(await mix(page, 'levelId')).toBe(161);
  expect(await mix(page, 'tip')).toBeNull(); // nothing new to explain: brown debuted at 101, stones at 141
  expect(await mix<number>(page, 'stones')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/01-livello-161.png` });

  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/02-livello-161-vinto.png` });
});
