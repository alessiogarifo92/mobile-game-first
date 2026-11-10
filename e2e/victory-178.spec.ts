import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { PANEL_ARM_MS } from '../src/core/panelInput';
import { LAST_LEVEL, PANEL_ARM_WAIT, mix, openLevel, play, tap, waitScene } from './helpers';

/**
 * #178: on the last level of a universe the win panel showed up ~450 ms after the winning move, over a frozen board,
 * and a slot tap in that gap landed on the panel's map/album button once it armed, leaving the level for the map.
 */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'queue', 'leftover'];
const shots = process.env.SHOTS_DIR;

type Point = { x: number; y: number };
type Clock = { won?: number; panel?: number };

async function startOnLastLevel(page: Page) {
  const save = { unlocked: LAST_LEVEL, completed: range(1, LAST_LEVEL - 1), seenTips: TIPS, sound: false, language: 'en' };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(save)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, LAST_LEVEL);
}

/** Records, frame by frame, when the level is won and when the win panel is up. */
async function watchWin(page: Page) {
  await page.evaluate(() => {
    const w = window as unknown as { __clock: Clock; __mix: { status: string; overlay: string | null } };
    w.__clock = {};
    const loop = () => {
      const now = performance.now();
      if (w.__mix.status === 'won' && w.__clock.won === undefined) w.__clock.won = now;
      if (w.__mix.overlay === 'win' && w.__clock.panel === undefined) w.__clock.panel = now;
      if (w.__clock.panel === undefined) requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  });
}

const clock = (page: Page) => page.evaluate(() => (window as unknown as { __clock: Clock }).__clock);
const where = (page: Page) =>
  page.evaluate(() => {
    const m = (window as unknown as { __mix: { scene: string; overlay: string | null } }).__mix;
    return { scene: m.scene, overlay: m.overlay };
  });

/** Waits in the page for the win panel, then taps every point at once (mousedown + mouseup on the canvas) and returns the ms elapsed since the panel opened. */
function burstOnPanel(points: { x: number; y: number }[]): Promise<number> {
  const clock = () => (window as unknown as { __clock: Clock }).__clock;
  return new Promise((resolve) => {
    const check = () => {
      if (clock().panel === undefined) return void requestAnimationFrame(check);
      const canvas = document.querySelector('canvas')!;
      for (const p of points) {
        const init = { bubbles: true, cancelable: true, clientX: p.x, clientY: p.y, button: 0, buttons: 1 };
        canvas.dispatchEvent(new MouseEvent('mousemove', init));
        canvas.dispatchEvent(new MouseEvent('mousedown', init));
        canvas.dispatchEvent(new MouseEvent('mouseup', { ...init, buttons: 0 }));
      }
      resolve(performance.now() - clock().panel!);
    };
    check();
  });
}

/** Waits in the page for the universe party, then taps its button on the frame it opens. Returns the ms elapsed since then. */
function tapPartyOnOpen(): Promise<number> {
  const mixOf = () => (window as unknown as { __mix?: { scene: string; goButton?: Point } }).__mix;
  return new Promise((resolve) => {
    const check = () => {
      const m = mixOf();
      if (m?.scene !== 'universeEnd' || !m.goButton) return void requestAnimationFrame(check);
      const opened = performance.now();
      const canvas = document.querySelector('canvas')!;
      const rect = canvas.getBoundingClientRect();
      const k = rect.width / 720;
      const init = { bubbles: true, cancelable: true, clientX: rect.x + m.goButton.x * k, clientY: rect.y + m.goButton.y * k, button: 0, buttons: 1 };
      canvas.dispatchEvent(new MouseEvent('mousemove', init));
      canvas.dispatchEvent(new MouseEvent('mousedown', init));
      canvas.dispatchEvent(new MouseEvent('mouseup', { ...init, buttons: 0 }));
      resolve(performance.now() - opened);
    };
    check();
  });
}

test.describe('win panel of the last level (#178)', () => {
  test.setTimeout(180_000);

  test('the panel opens on the winning frame, without a dead gap', async ({ page }) => {
    await startOnLastLevel(page);
    const solution = await mix<Move[]>(page, 'solution');
    await play(page, solution.slice(0, -1));
    await watchWin(page);
    await play(page, solution.slice(-1));
    await page.waitForFunction(() => (window as unknown as { __clock: Clock }).__clock.panel !== undefined);
    const t = await clock(page);
    // Before the fix the gap was ~490 ms (a 450 ms delayed call); now the panel is up within a frame or two of the win.
    expect(t.panel! - t.won!).toBeLessThan(150);
    if (shots) await page.screenshot({ path: `${shots}/01-pannello-subito.png` });
  });

  test('taps in the first moments after the win do not leave the level, and the universe party ignores an early tap', async ({ page }) => {
    await startOnLastLevel(page);
    const solution = await mix<Move[]>(page, 'solution');
    const slots = await mix<{ x: number; y: number; w: number; h: number }[]>(page, 'slots');
    // Screen coordinates computed up front, so the taps reach the page within the arming window and not after it.
    const box = (await page.locator('canvas').boundingBox())!;
    const k = box.width / 720;
    const scroll = await mix<number>(page, 'scrollY');
    const screen = (x: number, y: number) => ({ x: box.x + x * k, y: box.y + (y - scroll) * k });
    const top = (box.height / k - 760) / 2;
    const buttons = { next: { x: 360, y: top + 600 }, second: { x: 360, y: top + 700 } };
    const points = [...slots.map((s) => screen(s.x + s.w / 2, s.y + s.h / 2)), screen(buttons.second.x, buttons.second.y), screen(buttons.next.x, buttons.next.y)];

    await play(page, solution.slice(0, -1));
    await watchWin(page);
    // The player keeps tapping where the slots were: those points are now under the panel's buttons.
    // The taps fire inside the page on the frame the panel opens: real mouse clicks from the runner take ~1 s
    // in a loaded container, long enough for the buttons to arm, and the test would then prove nothing.
    const tapped = page.evaluate(burstOnPanel, points);
    await play(page, solution.slice(-1));
    const tappedAfter = await tapped;
    expect(tappedAfter).toBeLessThan(PANEL_ARM_MS);
    await page.waitForTimeout(300);
    expect(await where(page)).toEqual({ scene: 'play', overlay: 'win' });
    // The points tapped above really were the panel's buttons.
    const real = await mix<typeof buttons>(page, 'winButtons');
    for (const key of ['next', 'second'] as const) {
      expect(real[key].x).toBeCloseTo(buttons[key].x, 0);
      expect(real[key].y).toBeCloseTo(buttons[key].y, 0);
    }
    if (shots) await page.screenshot({ path: `${shots}/02-tap-ignorati.png` });

    // Once armed, the panel's main button works and opens the universe party.
    await page.waitForTimeout(PANEL_ARM_WAIT);
    // A tap still in flight when the party opens does not skip it to the map.
    const party = page.evaluate(tapPartyOnOpen);
    await tap(page, buttons.next.x, buttons.next.y);
    expect(await party).toBeLessThan(PANEL_ARM_MS);
    await page.waitForTimeout(100);
    expect((await where(page)).scene).toBe('universeEnd');
    if (shots) await page.screenshot({ path: `${shots}/03-festa-tap-ignorato.png` });

    const go = await mix<Point>(page, 'goButton');
    await page.waitForTimeout(PANEL_ARM_WAIT);
    await tap(page, go.x, go.y);
    await waitScene(page, 'menu');
  });
});
