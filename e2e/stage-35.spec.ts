import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 35 "Pirati" (#240): the map shows stage 35 after level 340; level 341 debuts the tunnel (#99) and plays to a win. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];
const won = () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win';

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after level 340 the map shows stage 35 with only level 341 playable', async ({ page }) => {
  await start(page, { unlocked: 341, completed: range(1, 340) });
  expect(await mix(page, 'universe')).toBe(4);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[31, 10], [32, 10], [33, 10], [34, 10], [35, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(301, 350));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id).filter((id) => id > 340)).toEqual([341]);
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([310, 320, 330, 340, 350]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-35.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 341, the Jolly Roger, debuts the tunnel: the card shows once on screen and the level plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 341, completed: range(1, 340), language: 'en', seenTips: TIPS });
      await openLevel(page, 341);
      expect(await mix(page, 'levelId')).toBe(341);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'tunnel');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} tunnel tip card at 341`);
      expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
      if (shots) await page.screenshot({ path: `${shots}/02-bandiera-suggerimento-${tag}.png` });

      expect(await dismissTip(page)).toBe('tunnel');
      await page.waitForTimeout(300);
      if (shots) await page.screenshot({ path: `${shots}/03-bandiera-galleria-${tag}.png` });
      expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
      await waitSim(page, won);
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(341);
      if (shots) await page.screenshot({ path: `${shots}/04-bandiera-vinto-${tag}.png` });
    });
  });
}

test('level 341 does not show the tunnel card again once it has been seen', async ({ page }) => {
  await start(page, { unlocked: 341, completed: range(1, 340), seenTips: [...TIPS, 'tunnel'] });
  await openLevel(page, 341);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
});

test('level 342, the black ship, keeps a tunnel on the belt without showing a card, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 342, completed: range(1, 341), seenTips: [...TIPS, 'tunnel'] });
  await openLevel(page, 342);
  expect(await mix(page, 'levelId')).toBe(342);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/05-nave-galleria.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(342);
});

test('level 350, the captain boss, keeps a tunnel and films on the board and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 350, completed: range(1, 349), seenTips: [...TIPS, 'tunnel'] });
  await openLevel(page, 350);
  expect(await mix(page, 'levelId')).toBe(350);
  await page.waitForTimeout(800);
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/06-capitano-boss.png` });
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(350);
});
