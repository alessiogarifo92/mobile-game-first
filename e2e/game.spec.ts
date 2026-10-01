import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import { buildLanes, parseLevel, type LevelDef } from '../src/core/level';
import { runLoop, type Move } from '../src/core/solver';

type Rect = { x: number; y: number; w: number; h: number };
const shots = process.env.SHOTS_DIR;

async function mix<T = unknown>(page: Page, key: string): Promise<T> {
  return page.evaluate((k) => (window as unknown as { __mix: Record<string, unknown> }).__mix[k], key) as Promise<T>;
}

/** Taps a point given in the game's logical coordinates. */
async function tap(page: Page, x: number, y: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  const k = box.width / 720;
  const off = await mix<number>(page, 'offsetY');
  await page.mouse.click(box.x + x * k, box.y + (y + off) * k);
}

async function waitScene(page: Page, scene: string) {
  await page.waitForFunction((s) => (window as unknown as { __mix?: { scene: string } }).__mix?.scene === s, scene);
}

async function play(page: Page, moves: Move[]) {
  const columns = await mix<Rect[]>(page, 'columns');
  for (const m of moves) {
    const r = m.from === 'column' ? columns[m.index]! : (await mix<Rect[]>(page, 'slots'))[m.index]!;
    await tap(page, r.x + r.w / 2, r.y + 40);
    await page.waitForFunction(() => {
      const m = (window as unknown as { __mix: { beltBusy: boolean; status: string } }).__mix;
      return !m.beltBusy || m.status !== 'playing';
    }, null, { timeout: 20_000 });
  }
}

/** Column launches (sequential play) that end in a jam, found offline with the core rules. */
function jamSequence(def: LevelDef): Move[] | null {
  const level = parseLevel(def);
  const lanes = buildLanes(level.width, level.height);
  const search = (paint: number[], heads: number[], slots: number, path: Move[]): Move[] | null => {
    for (let c = 0; c < level.columns.length; c++) {
      const s = level.columns[c]![heads[c]!];
      if (!s) continue;
      const next = paint.slice();
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
  return search(level.targets.map(() => 0), level.columns.map(() => 0), 0, []);
}

test('from the map, level 1 is played to a win and unlocks level 2', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await waitScene(page, 'menu');
  if (shots) await page.screenshot({ path: `${shots}/01-mappa.png` });

  const nodes = await mix<{ id: number; x: number; y: number; unlocked: boolean }[]>(page, 'nodes');
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([1]);
  await tap(page, nodes[0]!.x, nodes[0]!.y);
  await waitScene(page, 'play');
  expect(await mix(page, 'levelId')).toBe(1);
  if (shots) await page.screenshot({ path: `${shots}/02-livello1-inizio.png` });

  const solution = await mix<Move[]>(page, 'solution');
  await play(page, solution.slice(0, 1));
  if (shots) await page.screenshot({ path: `${shots}/03-livello1-in-corso.png` });
  await play(page, solution.slice(1));
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/04-vittoria.png` });

  await page.reload();
  await waitScene(page, 'menu');
  const after = await mix<{ id: number; unlocked: boolean }[]>(page, 'nodes');
  expect(after.filter((n) => n.unlocked).map((n) => n.id)).toEqual([1, 2]); // progress survived the reload
  expect(errors).toEqual([]);
});

test('a secondary colour is mixed on the canvas (level 4, orange)', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mix-and-splash/progress/v1', JSON.stringify({ unlocked: 15, completed: [], sound: false })));
  await page.goto('/');
  await waitScene(page, 'menu');
  const nodes = await mix<{ id: number; x: number; y: number }[]>(page, 'nodes');
  await tap(page, nodes[3]!.x, nodes[3]!.y);
  await waitScene(page, 'play');
  await play(page, await mix<Move[]>(page, 'solution'));
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/05-livello4-arancione.png` });
});

test('a jam pauses the belt and +1 slot resumes play', async ({ page }) => {
  const def = (levels as LevelDef[]).find((d) => jamSequence(d))!;
  const moves = jamSequence(def)!;
  await page.addInitScript(() => localStorage.setItem('mix-and-splash/progress/v1', JSON.stringify({ unlocked: 15, completed: [], sound: false })));
  await page.goto('/');
  await waitScene(page, 'menu');
  const nodes = await mix<{ id: number; x: number; y: number }[]>(page, 'nodes');
  await tap(page, nodes[def.id - 1]!.x, nodes[def.id - 1]!.y);
  await waitScene(page, 'play');
  await play(page, moves);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'jam');
  if (shots) await page.screenshot({ path: `${shots}/06-ingorgo.png` });
  const slotsBefore = (await mix<Rect[]>(page, 'slots')).length;
  // "+1 slot e continua" sits at panel top + 280 (see PlayScene.showJam).
  await tap(page, 360, (1280 - 480) / 2 + 280);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string | null } }).__mix.overlay === null);
  expect(await mix(page, 'status')).toBe('playing');
  expect((await mix<Rect[]>(page, 'slots')).length).toBe(slotsBefore + 1);
});
