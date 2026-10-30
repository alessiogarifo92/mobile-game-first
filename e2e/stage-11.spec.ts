import { expect, test } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { LAST_LEVEL, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 11 "Bosco" (#121): its boss, the oak (110), plays to a win on the universe 2 map. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const BOSS = LAST_LEVEL + 10;
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown'];

test('the oak, boss of stage 11, plays to a win and is saved as completed', async ({ page }) => {
  const save = { sound: false, language: 'it', unlocked: BOSS, completed: range(1, BOSS - 1), seenTips: TIPS };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(save)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
  expect(await mix(page, 'universe')).toBe(2);
  await openLevel(page, BOSS);
  expect(await mix(page, 'levelId')).toBe(BOSS);
  if (shots) await page.screenshot({ path: `${shots}/01-quercia-inizio.png` });

  const tips = await play(page, await mix<Move[]>(page, 'solution'));
  expect(tips).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/02-quercia-vinta.png` });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(BOSS);
});
