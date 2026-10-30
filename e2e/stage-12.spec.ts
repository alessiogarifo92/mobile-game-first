import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 12 "Montagna" (#122): its boss, the summit (level 120, brown + ice), plays to a win. */
const KEY = 'mix-and-splash/progress/v1';
const BOSS = 120;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown'];

async function start(page: Page) {
  const save = { sound: false, language: 'it', unlocked: BOSS, completed: range(1, BOSS - 1), seenTips: TIPS };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(save)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('the summit, boss of stage 12, plays to a win with its solution', async ({ page }) => {
  await start(page);
  await openLevel(page, BOSS);
  expect(await mix(page, 'levelId')).toBe(BOSS);
  if (shots) await page.screenshot({ path: `${shots}/01-vetta-inizio.png` });
  const tips = await play(page, await mix<Move[]>(page, 'solution'));
  expect(tips).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/02-vetta-vinta.png` });
});
