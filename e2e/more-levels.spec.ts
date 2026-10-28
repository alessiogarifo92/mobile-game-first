import { expect, test } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import stages from '../src/levels/stages.json' with { type: 'json' };
import type { Move } from '../src/core/solver';
import { LEVELS_PER_STAGE } from '../src/core/stages';
import { mix, openLevel, play, shots, tap, tapLevel, waitScene, waitSim } from './helpers';

/**
 * The game served with a second universe (as many full stages again) and a half-built stage after it, the start of a
 * third universe (`--mode more-levels`, see vite.config.ts).
 */
test.use({ baseURL: 'http://localhost:4174' });

const shipped = levels.length;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const all = range(1, shipped);
/** Stages in the fixture: the shipped ones twice, then a half-built one. */
const fixtureStages = stages.length * 2 + 1;
const KEY = 'mix-and-splash/progress/v1';

test('a player who finished the game keeps everything and plays the levels an update adds', async ({ page }) => {
  test.setTimeout(240_000);
  // A save from the shipped game, completed to the last level, with an earned skin in use.
  await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [KEY, JSON.stringify({
    unlocked: shipped, completed: all, sound: false, language: 'en', skin: 'gold',
    seenTips: ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt'],
  })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');

  // Every stage has its band, with the levels it has so far; the partial last stage says more are coming.
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => h.stage)).toEqual(range(1, fixtureStages));
  expect(headers.slice(-2).map((h) => h.count)).toEqual([LEVELS_PER_STAGE, LEVELS_PER_STAGE / 2]);
  expect(await mix(page, 'comingSoon')).toBe(true);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  const total = shipped * 2 + LEVELS_PER_STAGE / 2;
  expect(nodes).toHaveLength(total);
  // Every full stage ends with its boss; the half-built one has none yet.
  const shippedBosses = levels.filter((l) => l.boss).map((l) => l.id);
  const bosses = [...shippedBosses, ...shippedBosses.map((id) => id + shipped)];
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual(bosses);
  // The first new level (the first of universe 2) is open, the ones after it are not.
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([...all, shipped + 1]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-primo-livello-nuovo.png` });

  await openLevel(page, shipped + 1);
  expect(await mix(page, 'levelId')).toBe(shipped + 1);
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(saved).toMatchObject({ unlocked: shipped + 2, completed: [...all, shipped + 1], skin: 'gold' });
  if (shots) await page.screenshot({ path: `${shots}/02-vinto-primo-livello-nuovo.png` });

  // Back on the map: the last stage's band opens its album page, which has no skin to win and no next page.
  const buttons = await mix<{ second: { x: number; y: number } }>(page, 'winButtons');
  await tap(page, buttons.second.x, buttons.second.y);
  await waitScene(page, 'menu');
  await page.keyboard.press('Home');
  await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
  if (shots) await page.screenshot({ path: `${shots}/03-mappa-cima-stage-in-costruzione.png` });
  const band = (await mix<{ stage: number; y: number }[]>(page, 'headers')).at(-1)!;
  await tap(page, 360, band.y);
  await waitScene(page, 'album');
  expect(await mix(page, 'stage')).toBe(fixtureStages);
  expect(await mix(page, 'skin')).toBeNull();
  expect(await mix(page, 'complete')).toBe(false);
  if (shots) await page.screenshot({ path: `${shots}/04-album-stage-in-costruzione.png` });
});

test('completing a stage beyond the bucket styles celebrates it without promising a style', async ({ page }) => {
  test.setTimeout(300_000); // plays a whole boss
  const boss = shipped + LEVELS_PER_STAGE; // closes the first extra stage
  await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [KEY, JSON.stringify({
    unlocked: boss, completed: Array.from({ length: boss - 1 }, (_, i) => i + 1), sound: false, language: 'en',
    seenTips: ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt'],
  })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, boss);
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'completedStage')).toBe(stages.length + 1);
  expect(await mix(page, 'winText')).toBe('Stage complete!');
  if (shots) await page.screenshot({ path: `${shots}/05-stage-extra-completato.png` });
  const buttons = await mix<{ second: { x: number; y: number } }>(page, 'winButtons');
  await tap(page, buttons.second.x, buttons.second.y);
  await waitScene(page, 'album');
  expect(await mix(page, 'stage')).toBe(stages.length + 1);
  expect(await mix(page, 'complete')).toBe(true);
  expect(await mix(page, 'skin')).toBeNull();
});

test('the next universe opens only after the last level of the previous one (#90)', async ({ page }) => {
  test.setTimeout(240_000);
  const firstOfNext = shipped + 1;
  // A hand-edited save: level 100 not completed, but it claims an unlock deep into universe 2.
  await page.addInitScript(([key, save]) => localStorage.setItem(key, save), [KEY, JSON.stringify({
    unlocked: shipped + 50, completed: range(1, shipped - 1), sound: false, language: 'en',
    seenTips: ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt'],
  })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
  // Universe 2 stays closed: only universe 1 is open, up to its last level.
  const nodes = await mix<{ id: number; unlocked: boolean }[]>(page, 'nodes');
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(all);
  // Tapping the first level of universe 2 does not open it.
  await tapLevel(page, firstOfNext);
  await page.waitForTimeout(500);
  expect(await mix(page, 'scene')).toBe('menu');
  if (shots) await page.screenshot({ path: `${shots}/06-universo-2-chiuso.png` });
});
