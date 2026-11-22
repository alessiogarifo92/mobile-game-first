import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 31 "Spiaggia" (#236): universe 4 opens after level 300; level 301 debuts the film (#98) and plays to a win. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after universe 3 the map opens on universe 4, stage 31, with only level 301 playable', async ({ page }) => {
  await start(page, { unlocked: 301, completed: range(1, 300) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 340));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([301]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-universo-4.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 301, the sand bucket, debuts the film: the card shows once on screen and the level plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 301, completed: range(1, 300), language: 'en', seenTips: TIPS.filter((t) => t !== 'film') });
      await openLevel(page, 301);
      expect(await mix(page, 'levelId')).toBe(301);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'film');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} film tip card at 301`);
      expect(await mix(page, 'film')).toBe(2);
      if (shots) await page.screenshot({ path: `${shots}/02-secchiello-suggerimento-${tag}.png` });

      expect(await dismissTip(page)).toBe('film');
      expect(await mix(page, 'filmTears')).toBe(0);
      await page.waitForTimeout(300);
      if (shots) await page.screenshot({ path: `${shots}/03-secchiello-tela-${tag}.png` });
      expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
      expect(await mix(page, 'film')).toBe(0);
      expect(await mix(page, 'filmTears')).toBe(2);
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(301);
      if (shots) await page.screenshot({ path: `${shots}/04-secchiello-vinto-${tag}.png` });
    });
  });
}

test('level 302, the sandcastle, keeps films on the board without showing the card again, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 302, completed: range(1, 301), seenTips: [...TIPS, 'film'] });
  await openLevel(page, 302);
  expect(await mix(page, 'levelId')).toBe(302);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/05-castello-pellicole.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'film')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(302);
});
