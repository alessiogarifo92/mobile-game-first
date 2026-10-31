import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 19 "Notte nel bosco" (#129): a player at level 181 plays it to a win, with brown, stones and hidden pixels on the canvas. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('level 181, the firefly that opens the night in the woods, plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 181, completed: range(1, 180) });
  await openLevel(page, 181);
  expect(await mix(page, 'levelId')).toBe(181);
  expect(await mix(page, 'tip')).toBeNull(); // nothing new to explain: brown debuted at 101, stones at 141, hidden pixels in universe 1
  expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'stones')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/01-livello-181.png` });

  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'hidden')).toBe(0);
  if (shots) await page.screenshot({ path: `${shots}/02-livello-181-vinto.png` });
});
