import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import stages from '../src/levels/stages.json' with { type: 'json' };
import type { Move } from '../src/core/solver';
import { LEVELS_PER_STAGE } from '../src/core/stages';
import { checkOnScreen, mix, openLevel, play, shots, tap, waitScene, waitSim } from './helpers';

/**
 * The game served with a second universe (as many full stages again) and a half-built stage after it, the start of a
 * third universe (`--mode more-levels`, see vite.config.ts). The extra levels are copies of the stage 1 levels.
 */
test.use({ baseURL: 'http://localhost:4174' });

const shipped = levels.length;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const all = range(1, shipped);
const KEY = 'mix-and-splash/progress/v1';
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

async function openSelector(page: Page) {
  const button = await mix<{ x: number; y: number }>(page, 'universeButton');
  await tap(page, button.x, button.y);
  await waitScene(page, 'universes');
}

const saved = (page: Page) => page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);

test('a player who finished the game keeps everything and plays the next universe from level 101', async ({ page }) => {
  test.setTimeout(240_000);
  // A save from the shipped game, completed to the last level, with an earned skin in use.
  await start(page, { unlocked: shipped, completed: all, skin: 'gold' });

  // The map opens on universe 2, where the player is: its stages and levels only, starting from level 101.
  expect(await mix(page, 'universe')).toBe(2);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => h.stage)).toEqual(range(stages.length + 1, stages.length * 2));
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(shipped + 1, shipped * 2));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual(levels.filter((l) => l.boss).map((l) => l.id + shipped));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([shipped + 1]);
  expect(await mix(page, 'comingSoon')).toBe(false);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-universo-2.png` });

  await openLevel(page, shipped + 1);
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  // The win panel shows the universe's progress with +1.
  expect(await mix(page, 'universeProgress')).toEqual({ done: 1, total: shipped, plusOne: true });
  expect(await saved(page)).toMatchObject({ unlocked: shipped + 2, completed: [...all, shipped + 1], skin: 'gold' });
  if (shots) await page.screenshot({ path: `${shots}/02-vittoria-barra-universo.png` });
});

test('a universe still being built: its map says more levels are coming, its album has no skin to win', async ({ page }) => {
  await start(page, { unlocked: shipped * 2, completed: range(1, shipped * 2) });
  expect(await mix(page, 'universe')).toBe(3);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[stages.length * 2 + 1, LEVELS_PER_STAGE / 2]]);
  expect(await mix(page, 'comingSoon')).toBe(true);
  await page.keyboard.press('Home');
  await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
  const band = (await mix<{ stage: number; y: number }[]>(page, 'headers')).at(-1)!;
  await tap(page, 360, band.y);
  await waitScene(page, 'album');
  expect(await mix(page, 'stage')).toBe(stages.length * 2 + 1);
  expect(await mix(page, 'skin')).toBeNull();
  expect(await mix(page, 'complete')).toBe(false);
});

test('completing a stage beyond the bucket styles celebrates it without promising a style', async ({ page }) => {
  test.setTimeout(240_000);
  const boss = shipped + LEVELS_PER_STAGE; // closes the first extra stage
  await start(page, { unlocked: boss, completed: range(1, boss - 1) });
  await openLevel(page, boss);
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'completedStage')).toBe(stages.length + 1);
  expect(await mix(page, 'completedUniverse')).toBeNull();
  expect(await mix(page, 'winText')).toBe('Stage complete!');
  const buttons = await mix<{ second: { x: number; y: number } }>(page, 'winButtons');
  await tap(page, buttons.second.x, buttons.second.y);
  await waitScene(page, 'album');
  expect(await mix(page, 'stage')).toBe(stages.length + 1);
  expect(await mix(page, 'complete')).toBe(true);
  expect(await mix(page, 'skin')).toBeNull();
});

for (const [name, width, height] of [['360x640', 360, 640], ['412x915', 412, 915]] as const) {
  test.describe(name, () => {
    test.use({ viewport: { width, height } });

    test('a closed universe is shown but cannot be chosen; a hand-edited save cannot open it (#90, #91)', async ({ page }) => {
      // Level 100 not completed, but the save claims an unlock deep into universe 2.
      await start(page, { unlocked: shipped + 50, completed: range(1, shipped - 1) });
      expect(await mix(page, 'universe')).toBe(1);
      const nodes = await mix<{ id: number; unlocked: boolean }[]>(page, 'nodes');
      expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(all);

      await openSelector(page);
      const cards = await mix<{ id: number; open: boolean; unlockLevel: number | null; x: number; y: number }[]>(page, 'cards');
      expect(cards.map((c) => [c.id, c.open, c.unlockLevel])).toEqual([[1, true, null], [2, false, shipped], [3, false, shipped * 2]]);
      await checkOnScreen(page, `${name} selector`);
      if (shots) await page.screenshot({ path: `${shots}/03-selettore-${name}.png` });

      // A tap on the closed card explains why, and does not open it.
      await tap(page, cards[1]!.x, cards[1]!.y);
      await page.waitForFunction(() => (window as unknown as { __mix: { explained: number | null } }).__mix.explained === 2);
      expect(await mix(page, 'scene')).toBe('universes');
      await checkOnScreen(page, `${name} closed universe explained`);
      if (shots) await page.screenshot({ path: `${shots}/04-universo-chiuso-${name}.png` });
      const ok = await mix<{ x: number; y: number }>(page, 'okButton');
      await tap(page, ok.x, ok.y);
      await page.waitForFunction(() => (window as unknown as { __mix: { explained: number | null } }).__mix.explained === null);

      // The open card leads back to its map.
      await tap(page, cards[0]!.x, cards[0]!.y);
      await waitScene(page, 'menu');
      expect(await mix(page, 'universe')).toBe(1);
    });

    test('finishing a universe: the party shows once, opens the next universe, and can be seen again from the album', async ({ page }) => {
      test.setTimeout(300_000);
      const last = shipped * 2; // last level of universe 2
      await start(page, { unlocked: last, completed: range(1, last - 1) });
      expect(await mix(page, 'universe')).toBe(2);
      await openLevel(page, last);
      await play(page, await mix<Move[]>(page, 'solution'));
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
      expect(await mix(page, 'completedUniverse')).toBe(2);
      await checkOnScreen(page, `${name} win panel ending a universe`);

      const buttons = await mix<{ next: { x: number; y: number } }>(page, 'winButtons');
      await tap(page, buttons.next.x, buttons.next.y);
      await waitScene(page, 'universeEnd');
      expect(await mix(page, 'universe')).toBe(2);
      expect(await mix(page, 'next')).toBe(3);
      await page.waitForFunction(() => (window as unknown as { __mix: { done: boolean } }).__mix.done);
      await checkOnScreen(page, `${name} universe party`);
      if (shots) await page.screenshot({ path: `${shots}/05-festa-universo-${name}.png` });

      // "Go to universe 3": its map, from its first level.
      const go = await mix<{ x: number; y: number }>(page, 'goButton');
      await tap(page, go.x, go.y);
      await waitScene(page, 'menu');
      expect(await mix(page, 'universe')).toBe(3);
      expect((await mix<{ id: number }[]>(page, 'nodes'))[0]!.id).toBe(last + 1);

      // The album page of universe 2's last stage replays the party.
      await openSelector(page);
      const cards = await mix<{ id: number; x: number; y: number }[]>(page, 'cards');
      await tap(page, cards[1]!.x, cards[1]!.y);
      await waitScene(page, 'menu');
      await page.keyboard.press('Home');
      await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
      const band = (await mix<{ stage: number; y: number }[]>(page, 'headers')).at(-1)!;
      await tap(page, 360, band.y);
      await waitScene(page, 'album');
      await checkOnScreen(page, `${name} album with the party button`);
      const party = await mix<{ x: number; y: number }>(page, 'party');
      await tap(page, party.x, party.y);
      await waitScene(page, 'universeEnd');
      expect(await mix(page, 'universe')).toBe(2);

      // Replaying the last level does not celebrate again.
      await tap(page, (await mix<{ x: number; y: number }>(page, 'goButton')).x, (await mix<{ x: number; y: number }>(page, 'goButton')).y);
      await waitScene(page, 'menu');
      await openSelector(page);
      await tap(page, cards[1]!.x, cards[1]!.y);
      await waitScene(page, 'menu');
      await openLevel(page, last);
      await play(page, await mix<Move[]>(page, 'solution'));
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
      expect(await mix(page, 'completedUniverse')).toBeNull();
    });
  });
}
