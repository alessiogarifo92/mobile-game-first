import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/**
 * Stage 50 "Finale" (#275), the last of the game: the map of universe 5 shows stage 50 after level 490. Level 491 debuts
 * all four pairs together (ice, film, hidden pixels and a tunnel in one picture): its card shows once, on screen, to a
 * player who knows the four pairs; the other levels show no card and play to a win. The final boss (500, the 16×16 big
 * finale) fits on screen at 360×640 and plays to a win at both sizes.
 */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'film', 'tunnel', 'iceFilm', 'iceTunnel', 'hiddenFilm', 'hiddenTunnel'];
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

/** Plays the solver's solution of the open level to a win, and checks every hidden pixel, padlock, ice and film is gone. */
async function playToWin(page: Page, id: number) {
  expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
  await waitSim(page, won);
  expect(await mix(page, 'hidden')).toBe(0);
  expect(await mix(page, 'locked')).toBe(0);
  expect(await mix(page, 'ice')).toBe(0);
  expect(await mix(page, 'film')).toBe(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
}

/** All four obstacles of the finale are on the board of the open level. */
async function expectAllFour(page: Page) {
  expect(await mix<number>(page, 'hidden')).toBeGreaterThan(0);
  expect((await mix<number[]>(page, 'tunnels')).length).toBeGreaterThan(0);
  expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
  expect(await mix<number>(page, 'film')).toBeGreaterThan(0);
}

test('after level 490 the map of universe 5 shows stage 50 with only level 491 playable, and no "more levels coming"', async ({ page }) => {
  await start(page, { unlocked: 491, completed: range(1, 490) });
  expect(await mix(page, 'universe')).toBe(5);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.map((h) => [h.stage, h.count])).toEqual([[41, 10], [42, 10], [43, 10], [44, 10], [45, 10], [46, 10], [47, 10], [48, 10], [49, 10], [50, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  expect(nodes.map((n) => n.id)).toEqual(range(401, 500));
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(401, 491));
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual([410, 420, 430, 440, 450, 460, 470, 480, 490, 500]);
  // Stage 50 is the last and it is complete: the map no longer says more levels are on the way.
  expect(await mix(page, 'comingSoon')).toBe(false);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-50.png` });
});

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('level 491, the curtain, debuts all four pairs together: the card shows once on screen and the level plays to a win', async ({ page }) => {
      test.setTimeout(180_000);
      await start(page, { unlocked: 491, completed: range(1, 490), language: 'en' });
      await openLevel(page, 491);
      expect(await mix(page, 'levelId')).toBe(491);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'allPairs');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} all-pairs card at 491`);
      await expectAllFour(page);
      if (shots) await page.screenshot({ path: `${shots}/02-sipario-card-${tag}.png` });
      expect(await dismissTip(page)).toBe('allPairs');
      await page.waitForTimeout(300);
      expect(await mix(page, 'tip')).toBeNull();
      expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips, KEY)).toContain('allPairs');
      if (shots) await page.screenshot({ path: `${shots}/03-sipario-tela-${tag}.png` });
      await playToWin(page, 491);
    });
  });
}

test('level 492, the big bang, keeps all four with padlocks, without the card again, and plays to a win', async ({ page }) => {
  test.setTimeout(180_000);
  await start(page, { unlocked: 492, completed: range(1, 491), seenTips: [...TIPS, 'allPairs'] });
  await openWithoutCard(page, 492);
  await expectAllFour(page);
  expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/04-big-bang.png` });
  await playToWin(page, 492);
});

for (const size of SIZES) {
  test(`level 500, the big finale boss (16×16), opens its padlocks and plays to a win at ${size.width}x${size.height}, finishing the game`, async ({ page }) => {
    // A long solution on a 16×16 board, like every long boss (#272): 360 s on the loaded CI runner.
    test.setTimeout(360_000);
    await page.setViewportSize(size);
    const tag = `${size.width}x${size.height}`;
    await start(page, { unlocked: 500, completed: range(1, 499), seenTips: [...TIPS, 'allPairs'] });
    await openWithoutCard(page, 500);
    await expectAllFour(page);
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    await checkOnScreen(page, `${tag} 16×16 big finale at 500`);
    if (shots) await page.screenshot({ path: `${shots}/05-gran-finale-boss-${tag}.png` });
    await playToWin(page, 500);
    if (shots) await page.screenshot({ path: `${shots}/06-gran-finale-vinto-${tag}.png` });
  });
}
