import { expect, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import { buildLanes, parseLevel, type LevelDef } from '../src/core/level';
import { cloneBoard, createBoard, type Board } from '../src/core/rules';
import { runLoop, type Move } from '../src/core/solver';

export type Rect = { x: number; y: number; w: number; h: number };
export const shots = process.env.SHOTS_DIR;

export async function mix<T = unknown>(page: Page, key: string): Promise<T> {
  return page.evaluate((k) => (window as unknown as { __mix: Record<string, unknown> }).__mix[k], key) as Promise<T>;
}

/** Taps a point given in the game's logical coordinates. */
export async function tap(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 720;
  const scroll = await mix<number>(page, 'scrollY');
  await page.mouse.click(box.x + x * k, box.y + (y - scroll) * k);
}

/**
 * Slows the page's CPU by `E2E_CPU_THROTTLE` times (Chromium only), to reproduce a loaded CI runner locally:
 * `E2E_CPU_THROTTLE=6 npx playwright test -g "full belt" --repeat-each=20`. Does nothing when the variable is unset.
 */
export async function throttleCpu(page: Page) {
  const rate = Number(process.env.E2E_CPU_THROTTLE);
  if (!(rate > 1)) return;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate });
}

export async function waitScene(page: Page, scene: string) {
  await page.waitForFunction((s) => (window as unknown as { __mix?: { scene: string } }).__mix?.scene === s, scene);
}

/** Scrolls the map with real drags until the level's node is on screen, then opens it. */
export async function openLevel(page: Page, id: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 720;
  for (let i = 0; i < 60; i++) {
    const node = (await mix<{ id: number; x: number; y: number }[]>(page, 'nodes')).find((n) => n.id === id)!;
    const [scroll, viewH, bar] = await Promise.all([mix<number>(page, 'scrollY'), mix<number>(page, 'viewHeight'), mix<number>(page, 'barHeight')]);
    const screenY = node.y - scroll;
    if (screenY >= bar + 40 && screenY <= viewH - 40) {
      await tap(page, node.x, node.y);
      await waitScene(page, 'play');
      return;
    }
    // Drag by up to 500 logical px towards the node (a real swipe, slow enough to avoid a flick).
    const delta = Math.max(-700, Math.min(700, (bar + viewH) / 2 - screenY));
    const x = box.x + 40 * k, y0 = box.y + ((bar + viewH) / 2) * k;
    await page.mouse.move(x, y0);
    await page.mouse.down();
    for (let s = 1; s <= 10; s++) await page.mouse.move(x, y0 + (delta * k * s) / 10);
    await page.waitForTimeout(120);
    await page.mouse.up();
    await page.waitForTimeout(300);
  }
  throw new Error(`could not scroll to level ${id}`);
}


/** Closes an onboarding tip card if one is open; returns its id. */
export async function dismissTip(page: Page): Promise<string | null> {
  const tip = await mix<string | null>(page, 'tip');
  if (!tip) return null;
  const b = await mix<{ x: number; y: number }>(page, 'tipButton');
  await tap(page, b.x, b.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === null);
  return tip;
}

/**
 * Waits until `done` holds in the page. Game time slows down when the machine is loaded, so instead of a fixed
 * real-time limit the wait only fails when the simulation itself stops advancing (`tick` frozen for 15 s).
 */
export async function waitSim(page: Page, done: () => boolean): Promise<void> {
  let last = -1;
  for (;;) {
    try {
      await page.waitForFunction(done, null, { timeout: 15_000 });
      return;
    } catch (e) {
      const tick = await mix<number>(page, 'tick');
      if (tick === last) throw e;
      last = tick;
    }
  }
}

/** Plays moves with real taps, waiting for the belt to empty between moves; returns the tips it closed. */
export async function play(page: Page, moves: Move[]): Promise<string[]> {
  const tips: string[] = [];
  const columns = await mix<Rect[]>(page, 'columns');
  for (const m of moves) {
    const closed = await dismissTip(page);
    if (closed) tips.push(closed);
    const r = m.from === 'column' ? columns[m.index]! : (await mix<Rect[]>(page, 'slots'))[m.index]!;
    const before = await mix<number>(page, 'moves');
    await tap(page, r.x + r.w / 2, r.y + 40);
    // The scene publishes right after a launch, so the next wait sees the belt busy, never a stale snapshot.
    expect(await mix<number>(page, 'moves')).toBe(before + 1);
    await waitSim(page, () => {
      const m = (window as unknown as { __mix: { beltBusy: boolean; status: string; tip: string | null } }).__mix;
      return !m.beltBusy || m.status !== 'playing' || m.tip !== null;
    });
    // A tip pauses the belt: close it and let the bucket finish its loop.
    const late = await dismissTip(page);
    if (late) {
      tips.push(late);
      await waitSim(page, () => {
        const m = (window as unknown as { __mix: { beltBusy: boolean; status: string } }).__mix;
        return !m.beltBusy || m.status !== 'playing';
      });
    }
  }
  return tips;
}


/** Number of levels the game ships: the last one sits at the top of the map. */
export const LAST_LEVEL = (levels as LevelDef[]).length;

export const SEEN_ALL = JSON.stringify({ unlocked: LAST_LEVEL, completed: [], sound: false, language: 'en', seenTips: ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden'] });


/** Column launches (sequential play) that end in a jam, found offline with the core rules. */
export function jamSequence(def: LevelDef): Move[] | null {
  const level = parseLevel(def);
  const lanes = buildLanes(level.width, level.height);
  const search = (board: Board, heads: number[], slots: number, path: Move[]): Move[] | null => {
    for (let c = 0; c < level.columns.length; c++) {
      const s = level.columns[c]![heads[c]!];
      if (!s) continue;
      const next = cloneBoard(board);
      const left = runLoop(level, lanes, next, s.color, s.ammo);
      const move: Move = { from: 'column', index: c };
      if (left > 0 && slots >= level.slots) return [...path, move];
      const h = heads.slice();
      h[c]! += 1;
      const found = search(next, h, slots + (left > 0 ? 1 : 0), [...path, move]);
      if (found) return found;
    }
    return null;
  };
  return search(createBoard(level), level.columns.map(() => 0), 0, []);
}

