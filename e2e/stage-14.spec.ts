import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 14 "Deserto" (#124): a player at level 131 plays it to a win, with brown, ice and hidden pixels on the canvas. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('level 131, the saguaro that opens the desert, plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 131, completed: range(1, 130) });
  await openLevel(page, 131);
  expect(await mix(page, 'levelId')).toBe(131);
  expect(await mix(page, 'tip')).toBeNull(); // nothing new to explain: every mechanic of the stage is already known
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/01-livello-131.png` });

  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'hidden')).toBe(0);
  if (shots) await page.screenshot({ path: `${shots}/02-livello-131-vinto.png` });
});
