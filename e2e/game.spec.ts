import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import type { LevelDef } from '../src/core/level';
import type { Move } from '../src/core/solver';

import { SEEN_ALL, dismissTip, jamSequence, mix, play, shots, tap, waitScene, waitSim, type Rect } from './helpers';

/** On the map, drags until the level's node is in the visible area below the title bar, then taps it. */
async function openLevel(page: Page, id: number) {
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

test('first launch: English, guided level 1 played to a win, level 2 unlocked', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await waitScene(page, 'menu');
  if (shots) await page.screenshot({ path: `${shots}/01-mappa.png` });

  const nodes = await mix<{ id: number; x: number; y: number; unlocked: boolean }[]>(page, 'nodes');
  expect(nodes.filter((n) => n.unlocked).map((n) => n.id)).toEqual([1]);
  await openLevel(page, 1);
  expect(await mix(page, 'levelId')).toBe(1);
  expect(await mix(page, 'guide')).toBe('tap');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('en');
  if (shots) await page.screenshot({ path: `${shots}/02-livello1-tutorial.png` });

  const solution = await mix<Move[]>(page, 'solution');
  // The guide ignores taps outside the highlighted column.
  const columns = await mix<Rect[]>(page, 'columns');
  const other = columns.findIndex((_, i) => i !== solution[0]!.index);
  expect(other).toBeGreaterThanOrEqual(0); // level 1 has more than one column, or this check proves nothing
  await tap(page, columns[other]!.x + columns[other]!.w / 2, columns[other]!.y + 40);
  expect(await mix(page, 'beltBusy')).toBe(false);
  await play(page, solution.slice(0, 1));
  if (shots) await page.screenshot({ path: `${shots}/03-livello1-in-corso.png` });
  await play(page, solution.slice(1));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
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
  await openLevel(page, 4);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'mixing');
  if (shots) await page.screenshot({ path: `${shots}/05-suggerimento-mixing.png` });
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/06-livello4-arancione.png` });
});

test('a jam pauses the belt and +1 slot resumes play', async ({ page }) => {
  // The shortest jam among the first stages keeps this test quick and stable.
  const candidates = (levels as LevelDef[]).slice(0, 30).map((d) => ({ d, moves: jamSequence(d) })).filter((c) => c.moves);
  const { d: def, moves } = candidates.sort((a, b) => a.moves!.length - b.moves!.length || a.d.id - b.d.id)[0]! as { d: LevelDef; moves: Move[] };
  await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), SEEN_ALL);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, def.id);
  await play(page, moves);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'jam');
  if (shots) await page.screenshot({ path: `${shots}/07-ingorgo.png` });
  const slotsBefore = (await mix<Rect[]>(page, 'slots')).length;
  const jam = await mix<{ continue: { x: number; y: number } | null }>(page, 'jamButtons');
  await tap(page, jam.continue!.x, jam.continue!.y);
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

  // Swipe back and forth between pages, and a fresh visit starts on page 1 again.
  const settings = await mix<{ x: number; y: number }>(page, 'settingsButton');
  await tap(page, settings.x, settings.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  const howto = (await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons')).howto!;
  await tap(page, howto.x, howto.y);
  await waitScene(page, 'howto');
  expect(await mix(page, 'page')).toBe(0);
  const box = (await page.locator('canvas').boundingBox())!;
  const swipe = async (dx: number) => {
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width / 2, y);
    await page.mouse.down();
    await page.mouse.move(box.x + box.width / 2 + dx, y, { steps: 6 });
    await page.mouse.up();
  };
  await swipe(-200);
  await page.waitForFunction(() => (window as unknown as { __mix: { page: number } }).__mix.page === 1);
  await swipe(-200);
  await page.waitForFunction(() => (window as unknown as { __mix: { page: number } }).__mix.page === 2);
  await swipe(200);
  await page.waitForFunction(() => (window as unknown as { __mix: { page: number } }).__mix.page === 1);
  await swipe(200);
  await page.waitForFunction(() => (window as unknown as { __mix: { page: number } }).__mix.page === 0);
  await swipe(200); // already on the first page: nothing happens
  expect(await mix(page, 'page')).toBe(0);
  // Leave from page 3, come back: it opens on page 1, not where it was left.
  await swipe(-200);
  await swipe(-200);
  await page.waitForFunction(() => (window as unknown as { __mix: { page: number } }).__mix.page === 2);
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowRight');
  await page.waitForFunction(() => (window as unknown as { __mix: { page: number } }).__mix.page === 2);
  await tap(page, 60, 64); // ◀ back to Settings
  await waitScene(page, 'menu');
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
  const again = (await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons')).howto!;
  await tap(page, again.x, again.y);
  await waitScene(page, 'howto');
  expect(await mix(page, 'page')).toBe(0);

  await page.reload();
  await waitScene(page, 'menu');
  expect(await mix(page, 'language')).toBe('it'); // survives a reload
});

test('the map is split into stages and scrolls to far levels', async ({ page }) => {
  test.setTimeout(300_000); // 100 levels of map to scroll with real drags
  await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), SEEN_ALL);
  await page.goto('/');
  await waitScene(page, 'menu');
  const headers = await mix<{ stage: number }[]>(page, 'headers');
  expect(headers.map((h) => h.stage)).toEqual([...new Set((levels as LevelDef[]).map((d) => d.stage))]);
  const nodes = await mix<{ id: number; boss: boolean }[]>(page, 'nodes');
  expect(nodes.filter((n) => n.boss).map((n) => n.id)).toEqual((levels as LevelDef[]).filter((d) => d.boss).map((d) => d.id));
  const before = await mix<number>(page, 'scrollY');
  const last = (levels as LevelDef[]).length;
  if (shots) await page.screenshot({ path: `${shots}/10-mappa-stage.png` });
  await openLevel(page, last); // needs real scrolling: the map opens at the bottom
  expect(await mix(page, 'levelId')).toBe(last);
  expect(before).toBeGreaterThan(0);
});

test('completing a stage unlocks its bucket style in the album', async ({ page }) => {
  test.setTimeout(300_000); // plays the whole stage-1 boss
  // Levels 1–9 done: winning level 10 (the boss) completes stage 1.
  await page.addInitScript(() => localStorage.setItem('mix-and-splash/progress/v1', JSON.stringify({
    unlocked: 10, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9], sound: false, language: 'en',
    seenTips: ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden'],
  })));
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, 10);
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  expect(await mix(page, 'completedStage')).toBe(1);
  if (shots) await page.screenshot({ path: `${shots}/13-stage-completato.png` });

  const buttons = await mix<{ second: { x: number; y: number } }>(page, 'winButtons');
  await tap(page, buttons.second.x, buttons.second.y);
  await waitScene(page, 'album');
  expect(await mix(page, 'stage')).toBe(1);
  expect(await mix(page, 'complete')).toBe(true);
  expect(await mix(page, 'unlocked')).toBe(true);
  expect(await mix(page, 'activeSkin')).toBe('classic');
  const use = await mix<{ x: number; y: number }>(page, 'useButton');
  await tap(page, use.x, use.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { activeSkin: string } }).__mix.activeSkin === 'dots');
  if (shots) await page.screenshot({ path: `${shots}/14-album-stage-1.png` });

  // Saved before any reload (the init script would overwrite storage on the next navigation).
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('mix-and-splash/progress/v1')!).skin)).toBe('dots');
});

test('the level 1 guide is in Italian when the language is Italian', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mix-and-splash/progress/v1', JSON.stringify({ unlocked: 1, completed: [], sound: false, language: 'it', seenTips: [] })));
  await page.goto('/');
  await waitScene(page, 'menu');
  expect(await page.evaluate(() => document.documentElement.lang)).toBe('it');
  await openLevel(page, 1);
  expect(await mix(page, 'guide')).toBe('tap');
  expect(await mix<string>(page, 'guideText')).toBe('Tocca una colonna per mandare un secchiello sul nastro');
  if (shots) await page.screenshot({ path: `${shots}/15-guida-it.png` });
  await play(page, (await mix<Move[]>(page, 'solution')).slice(0, 1));
  expect(await mix(page, 'guide')).toBe('next');
  expect(await mix<string>(page, 'guideText')).toBe('Manda il prossimo!');
});

test('the map scrolls with the mouse wheel and the keyboard', async ({ page }) => {
  await page.goto('/');
  await waitScene(page, 'menu');
  const box = (await page.locator('canvas').boundingBox())!;
  const start = await mix<number>(page, 'scrollY');
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.wheel(0, -300);
  await page.waitForFunction((y) => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY < y, start);
  const up = await mix<number>(page, 'scrollY');
  await page.keyboard.press('PageDown');
  await page.waitForFunction((y) => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY > y, up);
  await page.keyboard.press('Home');
  await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
});

test.describe('full belt on a 360x640 phone', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test('a full belt refuses a launch: the indicator shows why and the belt tip explains it once', async ({ page }) => {
    // Level 71 is the first with a belt of 2 and has more columns than that.
    await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), SEEN_ALL);
    await page.goto('/');
    await waitScene(page, 'menu');
    await openLevel(page, 71);
    const { capacity } = await mix<{ used: number; capacity: number }>(page, 'belt');
    expect(capacity).toBe(2);
    const columns = await mix<Rect[]>(page, 'columns');
    expect(columns.length).toBeGreaterThan(capacity);

    // The indicator sits on the "waiting" row without touching its label.
    const texts = (await page.evaluate(() => window.__mixBounds!())).filter((o) => o.type === 'Text');
    const belt = texts.find((o) => o.text === 'BELT 0/2')!;
    const waiting = texts.find((o) => o.text === 'WAITING')!;
    expect(belt).toBeTruthy();
    expect(belt.x + belt.w).toBeLessThan(waiting.x);

    const tapColumn = (c: number) => tap(page, columns[c]!.x + columns[c]!.w / 2, columns[c]!.y + 40);
    // Taps in quick succession until the belt is full and refuses one: on a slow machine a bucket may finish its loop
    // between two taps, so the test does not assume which tap is refused.
    let refusedAt = -1;
    for (let i = 0; i < 12 && refusedAt < 0; i++) {
      const before = await mix<number>(page, 'moves');
      await tapColumn(i % columns.length);
      if ((await mix<number>(page, 'refusals')) === 0) continue;
      refusedAt = i;
      expect(await mix(page, 'moves')).toBe(before); // nothing launched
    }
    expect(refusedAt).toBeGreaterThanOrEqual(capacity);
    await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'belt');
    if (shots) await page.screenshot({ path: `${shots}/09-suggerimento-nastro.png` });
    expect(await dismissTip(page)).toBe('belt');
    if (shots) await page.screenshot({ path: `${shots}/10-indicatore-nastro.png` });
    const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('mix-and-splash/progress/v1')!).seenTips as string[]);
    expect(saved).toContain('belt'); // shown once: remembered with the other tips
  });
});
