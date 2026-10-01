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

/** Closes an onboarding tip card if one is open; returns its id. */
async function dismissTip(page: Page): Promise<string | null> {
  const tip = await mix<string | null>(page, 'tip');
  if (!tip) return null;
  const b = await mix<{ x: number; y: number }>(page, 'tipButton');
  await tap(page, b.x, b.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === null);
  return tip;
}

/** Plays moves with real taps, waiting for the belt to empty between moves; returns the tips it closed. */
async function play(page: Page, moves: Move[]): Promise<string[]> {
  const tips: string[] = [];
  const columns = await mix<Rect[]>(page, 'columns');
  for (const m of moves) {
    const closed = await dismissTip(page);
    if (closed) tips.push(closed);
    const r = m.from === 'column' ? columns[m.index]! : (await mix<Rect[]>(page, 'slots'))[m.index]!;
    await tap(page, r.x + r.w / 2, r.y + 40);
    await page.waitForFunction(() => {
      const m = (window as unknown as { __mix: { beltBusy: boolean; status: string; tip: string | null } }).__mix;
      return !m.beltBusy || m.status !== 'playing' || m.tip !== null;
    }, null, { timeout: 20_000 });
    // A tip pauses the belt: close it and let the bucket finish its loop.
    const late = await dismissTip(page);
    if (late) {
      tips.push(late);
      await page.waitForFunction(() => {
        const m = (window as unknown as { __mix: { beltBusy: boolean; status: string } }).__mix;
        return !m.beltBusy || m.status !== 'playing';
      }, null, { timeout: 20_000 });
    }
  }
  return tips;
}

const SEEN_ALL = JSON.stringify({ unlocked: 15, completed: [], sound: false, language: 'en', seenTips: ['guide', 'mixing', 'blocked', 'slots'] });

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

test('first launch: English, guided level 1 played to a win, level 2 unlocked', async ({ page }) => {
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
  expect(await mix(page, 'guide')).toBe('tap');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  if (shots) await page.screenshot({ path: `${shots}/02-livello1-tutorial.png` });

  const solution = await mix<Move[]>(page, 'solution');
  // The guide ignores taps outside the highlighted column.
  const columns = await mix<Rect[]>(page, 'columns');
  const other = columns.findIndex((_, i) => i !== solution[0]!.index);
  if (other >= 0) {
    await tap(page, columns[other]!.x + columns[other]!.w / 2, columns[other]!.y + 40);
    expect(await mix(page, 'beltBusy')).toBe(false);
  }
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

test('a secondary colour is mixed on the canvas (level 4), after the one-time mixing tip', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mix-and-splash/progress/v1', JSON.stringify({ unlocked: 15, completed: [], sound: false, seenTips: ['guide'] })));
  await page.goto('/');
  await waitScene(page, 'menu');
  const nodes = await mix<{ id: number; x: number; y: number }[]>(page, 'nodes');
  await tap(page, nodes[3]!.x, nodes[3]!.y);
  await waitScene(page, 'play');
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'mixing');
  if (shots) await page.screenshot({ path: `${shots}/05-suggerimento-mixing.png` });
  await play(page, await mix<Move[]>(page, 'solution'));
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/06-livello4-arancione.png` });
});

test('a jam pauses the belt and +1 slot resumes play', async ({ page }) => {
  const def = (levels as LevelDef[]).find((d) => jamSequence(d))!;
  const moves = jamSequence(def)!;
  await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), SEEN_ALL);
  await page.goto('/');
  await waitScene(page, 'menu');
  const nodes = await mix<{ id: number; x: number; y: number }[]>(page, 'nodes');
  await tap(page, nodes[def.id - 1]!.x, nodes[def.id - 1]!.y);
  await waitScene(page, 'play');
  await play(page, moves);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'jam');
  if (shots) await page.screenshot({ path: `${shots}/07-ingorgo.png` });
  const slotsBefore = (await mix<Rect[]>(page, 'slots')).length;
  // "+1 slot e continua" sits at panel top + 280 (see PlayScene.showJam).
  await tap(page, 360, (1280 - 480) / 2 + 280);
  await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string | null } }).__mix.overlay === null);
  expect(await mix(page, 'status')).toBe('playing');
  expect((await mix<Rect[]>(page, 'slots')).length).toBe(slotsBefore + 1);
});

test('the language is chosen in Settings and remembered; How to play pages through', async ({ page }) => {
  await page.goto('/');
  await waitScene(page, 'menu');
  expect(await mix(page, 'language')).toBe('en');
  const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
  await tap(page, gear.x, gear.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  let buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
  await tap(page, buttons['lang-it']!.x, buttons['lang-it']!.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { language: string; settingsOpen: boolean } }).__mix.language === 'it');
  if (shots) await page.screenshot({ path: `${shots}/08-impostazioni-italiano.png` });
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('it');

  buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
  await tap(page, buttons.howto!.x, buttons.howto!.y);
  await waitScene(page, 'howto');
  for (let i = 0; i < 3; i++) {
    expect(await mix(page, 'page')).toBe(i);
    if (shots && i === 1) await page.screenshot({ path: `${shots}/09-come-si-gioca.png` });
    const next = await mix<{ x: number; y: number }>(page, 'next');
    await tap(page, next.x, next.y);
    await waitScene(page, i < 2 ? 'howto' : 'menu');
  }

  await page.reload();
  await waitScene(page, 'menu');
  expect(await mix(page, 'language')).toBe('it'); // survives a reload
});
