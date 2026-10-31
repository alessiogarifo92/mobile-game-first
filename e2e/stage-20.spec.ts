import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 20 "Vulcano" (#130): a player at level 191 plays it to a win, with brown, stones, ice and hidden pixels. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('level 191, the lava drop that opens the volcano, plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 191, completed: range(1, 190) });
  await openLevel(page, 191);
  expect(await mix(page, 'levelId')).toBe(191);
  expect(await mix(page, 'tip')).toBeNull(); // every mechanic of the volcano was already explained in universes 1 and 2
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'stones')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/01-livello-191.png` });

  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/02-livello-191-vinto.png` });
});
