import { expect, type Page } from '@playwright/test';
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

export async function waitScene(page: Page, scene: string) {
  await page.waitForFunction((s) => (window as unknown as { __mix?: { scene: string } }).__mix?.scene === s, scene);
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


export const SEEN_ALL = JSON.stringify({ unlocked: 100, completed: [], sound: false, language: 'en', seenTips: ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden'] });


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

