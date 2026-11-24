import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 39 "Temporale" (#244): the map shows stage 39 after level 380; tunnels and padlocks are already known, so no card appears. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];
const won = () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win';

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

/** Opens `id`, checks it keeps a tunnel and padlocks without a card, then plays the solver's solution to a win. */
async function playLevel(page: Page, id: number, shot?: string, beforePlay?: () => Promise<void>) {
  await openLevel(page, id);
  expect(await mix(page, 'levelId')).toBe(id);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  await beforePlay?.();
  if (shots && shot) await page.screenshot({ path: `${shots}/${shot}` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 380 the map shows stage 39 with only level 381 playable', async ({ page }) => {
  await start(page, { unlocked: 381, completed: range(1, 380) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10], [35, 10], [36, 10], [37, 10], [38, 10], [39, 10], [40, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 400));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 380)).toEqual([381]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340, 350, 360, 370, 380, 390, 400]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-39.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 381, the storm cloud, keeps a tunnel and padlocks, shows no card and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 381, completed: range(1, 380), language: 'en' });
      await playLevel(page, 381, `02-nuvola-temporalesca-${tag}.png`, () => checkOnScreen(page, `${tag} level 381`));
      if (shots) await page.screenshot({ path: `${shots}/03-nuvola-vinta-${tag}.png` });
    });
  });
}

test('level 387, the ship in the storm, keeps a tunnel and padlocks on the board without a card, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 387, completed: range(1, 386) });
  await playLevel(page, 387, '04-nave-nella-tempesta.png');
});

test('level 390, the storm boss, keeps a tunnel and padlocks on the board and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 390, completed: range(1, 389) });
  await playLevel(page, 390, '05-la-tempesta-boss.png');
});
