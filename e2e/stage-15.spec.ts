import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 15 "Giungla" (#125): stones debut at level 141, the papaya, with their one-time tip. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown'];

/** Seeds the save once: a reload keeps what the game saved since (the tip seen, the level won). */
async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => {
    if (localStorage.getItem(key) === null) localStorage.setItem(key, value);
  }, [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

const saved = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);

test('stones debut at level 141: the tip explains them once, a shot stops on a stone, the papaya is won', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 141, completed: range(1, 140) });
  await openLevel(page, 141);
  expect(await mix(page, 'levelId')).toBe(141);
  expect(await mix<number>(page, 'stones')).toBe(2);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'stone');
  await checkOnScreen(page, 'level 141, stone tip card');
  if (shots) await page.screenshot({ path: `${shots}/01-suggerimento-pietra.png` });
  expect(await dismissTip(page)).toBe('stone');
  if (shots) await page.screenshot({ path: `${shots}/02-papaia-con-pietre.png` });

  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  // The stones sit between orange pixels of one row: once the near one is done, a shot for the far one meets a stone.
  expect(await mix<number>(page, 'stoneSplashes')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/03-papaia-vinta.png` });
  expect((await saved(page)).seenTips).toContain('stone');

  // Shown only once: back on level 141 after a reload, nothing new to explain.
  await page.reload();
  await waitScene(page, 'menu');
  await openLevel(page, 141);
  expect(await mix(page, 'levelId')).toBe(141);
  expect(await mix(page, 'tip')).toBeNull();
});
