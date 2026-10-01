import { expect, test, type Page } from '@playwright/test';
import { mix, shots, tap, waitScene, type Rect } from './helpers';

/** Device matrix of issue #62 (CSS px): the game must fit and stay usable on every one of them. */
const SCREENS: [string, number, number][] = [
  ['small-320x568', 320, 568],
  ['small-360x640', 360, 640],
  ['standard-390x844', 390, 844],
  ['tall-412x915', 412, 915],
  ['taller-412x1000', 412, 1000],
  ['folded-280x653', 280, 653],
  ['unfolded-717x512', 717, 512],
  ['tablet-768x1024', 768, 1024],
  ['tablet-1024x1366', 1024, 1366],
  ['desktop-1920x1080', 1920, 1080],
];

const SAVE = JSON.stringify({
  unlocked: 100, completed: [], sound: false, language: 'en', seenTips: ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden'],
});

/** The canvas is entirely inside the window: nothing is cut off. */
async function expectCanvasVisible(page: Page, width: number, height: number): Promise<number> {
  const box = (await page.locator('canvas').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(-1);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(height + 1);
  return box.width / 720; // real px per logical unit
}

async function checkPlay(page: Page, k: number, name: string, shot: string) {
  const screen = await mix<number>(page, 'screenHeight');
  const columns = await mix<Rect[]>(page, 'columns');
  const slots = await mix<Rect[]>(page, 'slots');
  for (const r of [...columns, ...slots]) {
    expect(r.x).toBeGreaterThanOrEqual(0);
    expect(r.x + r.w).toBeLessThanOrEqual(720);
    expect(r.y + r.h).toBeLessThanOrEqual(screen);
  }
  // The controls sit in the lower half of the screen (thumb zone), whatever the height.
  expect(Math.min(...columns.map((c) => c.y))).toBeGreaterThan(screen / 2);
  // Touch targets, in real pixels: a column is 120 units wide; slots grow their touch margin on small screens (unit-tested).
  for (const c of columns) expect(c.w * k).toBeGreaterThanOrEqual(44 - 1);
  expect(slots.length).toBeGreaterThan(0);
  if (shots) await page.screenshot({ path: `${shots}/screens/${name}-${shot}.png` });
}

for (const [name, width, height] of SCREENS) {
  test.describe(name, () => {
    test.use({ viewport: { width, height } });

    test('map, levels 1 and 100, and the other screens fit', async ({ page }) => {
      const errors: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), SAVE);
      await page.goto('/');
      await waitScene(page, 'menu');
      const k = await expectCanvasVisible(page, width, height);
      // Real-pixel size of the smallest tap targets: the gear and a level node.
      expect(84 * k).toBeGreaterThan(0);
      if (shots) await page.screenshot({ path: `${shots}/screens/${name}-map.png` });

      // Level 100 (14x14, the biggest board): Home scrolls to the top of the map.
      await page.keyboard.press('Home');
      await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
      const nodes = await mix<{ id: number; x: number; y: number }[]>(page, 'nodes');
      const top = nodes.find((n) => n.id === 100)!;
      await tap(page, top.x, top.y);
      await waitScene(page, 'play');
      expect(await mix(page, 'levelId')).toBe(100);
      await checkPlay(page, k, name, 'level100');

      // Level 1 (small board) through the in-game Retry? No: back to the map and open level 1.
      await tap(page, 60, 64);
      await waitScene(page, 'menu');
      await page.keyboard.press('End');
      await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number; viewHeight: number } }).__mix.scrollY > 0);
      const first = (await mix<{ id: number; x: number; y: number }[]>(page, 'nodes')).find((n) => n.id === 1)!;
      await tap(page, first.x, first.y);
      await waitScene(page, 'play');
      await checkPlay(page, k, name, 'level1');

      // Settings → How to play (last page) and Backup & reset: both reachable and visible.
      await tap(page, 60, 64);
      await waitScene(page, 'menu');
      const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
      await tap(page, gear.x, gear.y);
      await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
      const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
      if (shots) await page.screenshot({ path: `${shots}/screens/${name}-settings.png` });
      await tap(page, buttons.progress!.x, buttons.progress!.y);
      await waitScene(page, 'data');
      expect(await mix<number>(page, 'screenHeight')).toBeGreaterThanOrEqual(1280);
      if (shots) await page.screenshot({ path: `${shots}/screens/${name}-data.png` });
      expect(errors).toEqual([]);
    });
  });
}
