import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 18 "Inverno" (#128): a player at level 171 plays it to a win, with brown, stones and ice on the canvas. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('level 171, the fir tree that opens the winter, plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 171, completed: range(1, 170) });
  await openLevel(page, 171);
  expect(await mix(page, 'levelId')).toBe(171);
  expect(await mix(page, 'tip')).toBeNull(); // nothing new to explain: brown debuted at 101, stones at 141, ice in universe 1
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'stones')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/01-livello-171.png` });

  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/02-livello-171-vinto.png` });
});
