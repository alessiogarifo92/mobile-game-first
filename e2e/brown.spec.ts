import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { LAST_LEVEL, dismissTip, mix, openLevel, play, shots, tap, waitScene, waitSim } from './helpers';

/** Brown pixels (#94): the one-time tip at the debut level (101, first of universe 2) and the "How to play" page. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS_BEFORE = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('the brown tip shows once, at the debut level 101, which then plays to a win', async ({ page }) => {
  const debut = LAST_LEVEL + 1;
  await start(page, { unlocked: debut, completed: range(1, LAST_LEVEL), seenTips: TIPS_BEFORE });
  expect(await mix(page, 'universe')).toBe(2); // the player is in universe 2 now
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-universo-2.png` });
  await openLevel(page, debut);
  expect(await mix(page, 'levelId')).toBe(debut);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'brown');
  if (shots) await page.screenshot({ path: `${shots}/02-suggerimento-marrone.png` });
  expect(await dismissTip(page)).toBe('brown');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips, KEY)).toContain('brown');

  // Play until a bucket has left a brown pixel with some but not all of its primaries, then finish the level.
  const solution = await mix<Move[]>(page, 'solution');
  await play(page, solution.slice(0, 2));
  if (shots) await page.screenshot({ path: `${shots}/03-pixel-marrone-a-meta.png` });
  const tips = await play(page, solution.slice(2));
  expect(tips).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/04-livello-101-vinto.png` });

  // Played again, the tip does not come back.
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, debut);
  await page.waitForTimeout(300);
  expect(await mix(page, 'tip')).toBeNull();
});

test('"How to play" has a fourth page: red + yellow + blue = brown', async ({ page }) => {
  await start(page, { unlocked: 1, completed: [], seenTips: TIPS_BEFORE, language: 'it' });
  const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
  await tap(page, gear.x, gear.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
  await tap(page, buttons.howto!.x, buttons.howto!.y);
  await waitScene(page, 'howto');
  for (let p = 1; p <= 3; p++) {
    const next = await mix<{ x: number; y: number }>(page, 'next');
    await tap(page, next.x, next.y);
    await page.waitForFunction((n) => (window as unknown as { __mix: { scene: string; page: number } }).__mix.page === n, p);
  }
  expect(await mix(page, 'page')).toBe(3);
  if (shots) await page.screenshot({ path: `${shots}/05-come-si-gioca-marrone.png` });
  // The last page's button starts playing: back to the map.
  const next = await mix<{ x: number; y: number }>(page, 'next');
  await tap(page, next.x, next.y);
  await waitScene(page, 'menu');
});
