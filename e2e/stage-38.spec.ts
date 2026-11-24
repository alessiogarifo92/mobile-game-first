import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 38 "Mongolfiere" (#243): the map shows stage 38 after level 370; tunnels and padlocks are already known, so no card appears. */
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

test('after level 370 the map shows stage 38 with only level 371 playable', async ({ page }) => {
  await start(page, { unlocked: 371, completed: range(1, 370) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10], [35, 10], [36, 10], [37, 10], [38, 10], [39, 10], [40, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 400));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 370)).toEqual([371]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340, 350, 360, 370, 380, 390, 400]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-38.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 371, the striped balloon, keeps a tunnel and padlocks, shows no card and plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 371, completed: range(1, 370), language: 'en' });
      await playLevel(page, 371, `02-mongolfiera-a-strisce-${tag}.png`, () => checkOnScreen(page, `${tag} level 371`));
      if (shots) await page.screenshot({ path: `${shots}/03-mongolfiera-vinta-${tag}.png` });
    });
  });
}

test('level 377, the balloonist, keeps a tunnel and padlocks on the board without a card, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 377, completed: range(1, 376) });
  await playLevel(page, 377, '04-aeronauta-galleria-lucchetto.png');
});

test('level 380, the grand balloon boss, keeps a tunnel and padlocks on the board and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 380, completed: range(1, 379) });
  await playLevel(page, 380, '05-grande-mongolfiera-boss.png');
});
