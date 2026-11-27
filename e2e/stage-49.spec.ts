import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 49 "Buchi neri" (#274): the map of universe 5 shows stage 49 after level 480. Level 481 debuts the pair hidden
 * pixels + tunnel: its card shows once, on screen, to a player who knows both halves; the other levels show no card and
 * play to a win. The boss (490, the 16×16 devourer) fits on screen at 360×640 and plays to a win at both sizes.
 */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel', 'iceFilm', 'iceTunnel', 'hiddenFilm'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];
const won = () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win';

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

/** Opens a level, checks no card shows, and returns once the board is ready. */
async function openWithoutCard(page: Page, id: number) {
  await openLevel(page, id);
  expect(await mix(page, 'levelId')).toBe(id);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
}

/** Plays the solver's solution of the open level to a win, and checks every hidden pixel and padlock is gone. */
async function playToWin(page: Page, id: number) {
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'hidden')).toBe(0);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

test('after level 480 the map of universe 5 shows stage 49 with only level 481 playable', async ({ page }) => {
  await start(page, { unlocked: 481, completed: range(1, 480) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10], [46, 10], [47, 10], [48, 10], [49, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 490));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 481));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450, 460, 470, 480, 490]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-49.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 481, the horizon, debuts hidden + tunnel: the pair card shows once on screen and the level plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 481, completed: range(1, 480), language: 'en' });
      await openLevel(page, 481);
      expect(await mix(page, 'levelId')).toBe(481);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'hiddenTunnel');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} hidden + tunnel card at 481`);
      expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
      expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
      if (shots) await page.screenshot({ path: `${shots}/02-orizzonte-card-${tag}.png` });
      expect(await dismissTip(page)).toBe('hiddenTunnel');
      await page.waitForTimeout(300);
      expect(await mix(page, 'tip')).toBeNull();
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips, KEY)).toContain('hiddenTunnel');
      if (shots) await page.screenshot({ path: `${shots}/03-orizzonte-tela-${tag}.png` });
      await playToWin(page, 481);
    });
  });
}

test('level 482, the disk, keeps hidden pixels and the tunnel with padlocks, without the card again, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 482, completed: range(1, 481), seenTips: [...TIPS, 'hiddenTunnel'] });
  await openWithoutCard(page, 482);
  expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-disco.png` });
  await playToWin(page, 482);
});

for (const size of SIZES) {
  test(`level 490, the devourer boss (16×16), opens its padlocks and plays to a win at ${size.width}x${size.height}, finishing stage 49`, async ({ page }) => {
    // A long solution on a 16×16 board: about 4 minutes on the loaded CI runner (#272), so 360 s like every long boss.
    test.setTimeout(360_000);
    await page.setViewportSize(size);
    const tag = `${size.width}x${size.height}`;
    await start(page, { unlocked: 490, completed: range(1, 489), seenTips: [...TIPS, 'hiddenTunnel'] });
    await openWithoutCard(page, 490);
    expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
    expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    await checkOnScreen(page, `${tag} 16×16 devourer at 490`);
    if (shots) await page.screenshot({ path: `${shots}/05-divoratore-boss-${tag}.png` });
    await playToWin(page, 490);
    if (shots) await page.screenshot({ path: `${shots}/06-divoratore-vinto-${tag}.png` });
  });
}
