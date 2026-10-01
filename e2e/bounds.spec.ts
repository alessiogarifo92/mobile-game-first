import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import type { LevelDef } from '../src/core/level';
import type { Move } from '../src/core/solver';
import type { DrawnBounds } from '../src/game/debug';
import { SEEN_ALL, dismissTip, jamSequence, mix, play, shots, tap, waitScene, waitSim } from './helpers';

/**
 * Nothing the game draws or lets you tap may be outside the screen, on any device. This walks every screen and
 * panel on a matrix of phone/tablet sizes, with and without system bars, and checks the bounds of every visible
 * text, shape and tap zone (not just the rectangles the scenes publish).
 */
const SCREENS: [string, number, number][] = [
  ['320x568', 320, 568], ['360x640', 360, 640], ['360x800', 360, 800], ['390x844', 390, 844], ['412x915', 412, 915],
  ['412x1000', 412, 1000], ['280x653', 280, 653], ['717x512', 717, 512], ['768x1024', 768, 1024],
  ['1024x1366', 1024, 1366], ['1920x1080', 1920, 1080],
];

/** [status bar, gesture bar] heights in CSS px, as Android edge-to-edge reports them. */
const BARS: [number, number][] = [[0, 0], [48, 34]];

async function setBars(page: Page, top: number, bottom: number) {
  await page.addStyleTag({ content: `:root { --safe-area-inset-top: ${top}px; --safe-area-inset-bottom: ${bottom}px; }` });
}

async function check(page: Page, label: string, opts: { minDepth?: number } = {}) {
  const [objects, screen, scrollY] = await Promise.all([
    page.evaluate(() => window.__mixBounds!()),
    page.evaluate(() => document.querySelector('canvas')!.height / (document.querySelector('canvas')!.width / 720)),
    page.evaluate(() => window.__mix!.scrollY as number),
  ]);
  const h = Math.round(screen);
  const bad: string[] = [];
  for (const o of objects as DrawnBounds[]) {
    if (o.depth < (opts.minDepth ?? 0)) continue;
    if (o.w === 0 && o.h === 0) continue;
    const top = scrollY;
    const outside = o.x < -2 || o.x + o.w > 722 || o.y < top - 2 || o.y + o.h > top + h + 2;
    if (outside) bad.push(`${o.type}${o.text ? ` "${o.text.slice(0, 24)}"` : ''} x=${Math.round(o.x)} y=${Math.round(o.y - top)} w=${Math.round(o.w)} h=${Math.round(o.h)} (screen 720x${h})`);
  }
  expect(bad, `${label}: drawn outside the screen`).toEqual([]);
}

/** Canvas inside the free area of the window. */
async function checkCanvas(page: Page, width: number, height: number, top: number, bottom: number) {
  const box = (await page.locator('canvas').boundingBox())!;
  expect(box.x).toBeGreaterThanOrEqual(-1);
  expect(box.y).toBeGreaterThanOrEqual(top - 1);
  expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
  expect(box.y + box.height).toBeLessThanOrEqual(height - bottom + 1);
}

async function settle(page: Page) {
  await page.waitForTimeout(250);
}

async function openSettings(page: Page) {
  const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
  await tap(page, gear.x, gear.y);
  await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
}

for (const [name, width, height] of SCREENS) {
  for (const [top, bottom] of BARS) {
    test.describe(`${name}${top ? ' with system bars' : ''}`, () => {
      test.use({ viewport: { width, height } });

      test('menu, settings, backup, how to play, album', async ({ page }) => {
        await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), SEEN_ALL);
        await page.goto('/');
        await waitScene(page, 'menu');
        if (top) {
          await setBars(page, top, bottom);
          await page.waitForFunction((h) => document.getElementById('game')!.clientHeight === h, height - top - bottom);
          await waitScene(page, 'menu');
        }
        await settle(page);
        await checkCanvas(page, width, height, top, bottom);
        await check(page, 'map at the current level', { minDepth: 5 });
        await page.keyboard.press('Home');
        await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
        await check(page, 'map top', { minDepth: 5 });
        if (shots) await page.screenshot({ path: `${shots}/bounds/${name}${top ? '-bars' : ''}-map-top.png` });

        await openSettings(page);
        await settle(page);
        await check(page, 'settings', { minDepth: 5 });
        if (shots) await page.screenshot({ path: `${shots}/bounds/${name}${top ? '-bars' : ''}-settings.png` });
        const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');

        await tap(page, buttons.progress!.x, buttons.progress!.y);
        await waitScene(page, 'data');
        await settle(page);
        await check(page, 'backup & reset');
        const data = await mix<Record<string, { x: number; y: number }>>(page, 'buttons');
        await tap(page, data.reset!.x, data.reset!.y);
        await page.waitForFunction(() => (window as unknown as { __mix: { overlay: boolean } }).__mix.overlay);
        await settle(page);
        await check(page, 'reset confirmation');
        if (shots) await page.screenshot({ path: `${shots}/bounds/${name}${top ? '-bars' : ''}-reset.png` });
        const confirm = await mix<Record<string, { x: number; y: number }>>(page, 'buttons');
        await tap(page, confirm.cancel!.x, confirm.cancel!.y);
        await tap(page, 60, 64);
        await waitScene(page, 'menu');

        await openSettings(page);
        const again = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
        await tap(page, again.howto!.x, again.howto!.y);
        await waitScene(page, 'howto');
        for (let i = 0; i < 3; i++) {
          await page.waitForFunction((n) => (window as unknown as { __mix: { page: number } }).__mix.page === n, i);
          await settle(page);
          await check(page, `how to play page ${i + 1}`);
          if (shots) await page.screenshot({ path: `${shots}/bounds/${name}${top ? '-bars' : ''}-howto-${i + 1}.png` });
          if (i < 2) await page.keyboard.press('ArrowRight');
        }
        await tap(page, 60, 64); // back to the map with Settings still open
        await waitScene(page, 'menu');
        await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
        const closeButtons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
        await tap(page, closeButtons.close!.x, closeButtons.close!.y);
        await page.waitForFunction(() => !(window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);

        // Album: tap the first stage band on the map.
        await page.keyboard.press('End');
        await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY > 0);
        const headers = await mix<{ stage: number; y: number }[]>(page, 'headers');
        const header = headers.find((h) => h.stage === 1)!;
        await tap(page, 360, header.y);
        await waitScene(page, 'album');
        await settle(page);
        await check(page, 'album stage 1');
        if (shots) await page.screenshot({ path: `${shots}/bounds/${name}${top ? '-bars' : ''}-album.png` });
      });

      test('levels: guide, tip cards, biggest board', async ({ page }) => {
        test.setTimeout(240_000);
        // Fresh player: level 1 with the guide; level 4 shows the mixing tip card.
        await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), JSON.stringify({
          unlocked: 100, completed: [], sound: false, language: 'en', seenTips: [],
        }));
        await page.goto('/');
        await waitScene(page, 'menu');
        if (top) {
          await setBars(page, top, bottom);
          await page.waitForFunction((h) => document.getElementById('game')!.clientHeight === h, height - top - bottom);
          await waitScene(page, 'menu');
        }
        await page.keyboard.press('End');
        await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY > 0);
        const open = async (id: number) => {
          const node = (await mix<{ id: number; x: number; y: number }[]>(page, 'nodes')).find((n) => n.id === id)!;
          await tap(page, node.x, node.y);
          await waitScene(page, 'play');
        };
        const home = async () => {
          await tap(page, 60, 64);
          await waitScene(page, 'menu');
        };
        const bar = `${name}${top ? '-bars' : ''}`;

        await open(1);
        expect(await mix(page, 'guide')).toBe('tap');
        await settle(page);
        await check(page, 'level 1, guide: tap a column');
        if (shots) await page.screenshot({ path: `${shots}/bounds/${bar}-level1-guide.png` });
        const solution = await mix<Move[]>(page, 'solution');
        await play(page, solution.slice(0, 1));
        expect(await mix(page, 'guide')).toBe('next');
        await settle(page);
        await check(page, 'level 1, guide: send the next one');
        await play(page, solution.slice(1));
        await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
        await settle(page);
        await check(page, 'level 1, win panel');
        if (shots) await page.screenshot({ path: `${shots}/bounds/${bar}-level1-win.png` });
        await page.reload();
        await waitScene(page, 'menu');
        if (top) {
          await setBars(page, top, bottom);
          await page.waitForFunction((h) => document.getElementById('game')!.clientHeight === h, height - top - bottom);
          await waitScene(page, 'menu');
        }
        await page.keyboard.press('End');
        await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY > 0);

        // A level with the "mixing" tip card.
        await open(4);
        await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'mixing');
        await settle(page);
        await check(page, 'level 4, mixing tip card');
        if (shots) await page.screenshot({ path: `${shots}/bounds/${bar}-level4-tip.png` });
        expect(await dismissTip(page)).toBe('mixing');
        await home();

        // The biggest board (14x14, ice and hidden pixels): Home scrolls to level 100 at the top of the map.
        await page.keyboard.press('Home');
        await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
        await open(100);
        await settle(page);
        await check(page, 'level 100');
        if (shots) await page.screenshot({ path: `${shots}/bounds/${bar}-level100.png` });
      });
    });
  }
}

// Jam panel: needs a level that can jam, found offline; one phone and one tall phone are enough for the panel layout.
for (const [name, width, height] of [['360x640', 360, 640], ['412x915', 412, 915]] as const) {
  test.describe(`${name} jam panel`, () => {
    test.use({ viewport: { width, height } });
    test('jam panel and +1 slot', async ({ page }) => {
      test.setTimeout(240_000);
      const candidates = (levels as LevelDef[]).slice(0, 30).map((d) => ({ d, moves: jamSequence(d) })).filter((c) => c.moves);
      const { d: def, moves } = candidates.sort((a, b) => a.moves!.length - b.moves!.length || a.d.id - b.d.id)[0]! as { d: LevelDef; moves: Move[] };
      await page.addInitScript((p) => localStorage.setItem('mix-and-splash/progress/v1', p), SEEN_ALL);
      await page.goto('/');
      await waitScene(page, 'menu');
      await page.keyboard.press('Home');
      await page.waitForFunction(() => (window as unknown as { __mix: { scrollY: number } }).__mix.scrollY === 0);
      // Walk to the level with real scrolling keys (End → bottom, then Home/PageUp until visible).
      await page.keyboard.press('End');
      for (let i = 0; i < 40; i++) {
        const [nodes, scroll, viewH] = await Promise.all([
          mix<{ id: number; x: number; y: number }[]>(page, 'nodes'), mix<number>(page, 'scrollY'), mix<number>(page, 'viewHeight'),
        ]);
        const node = nodes.find((n) => n.id === def.id)!;
        if (node.y - scroll > 280 && node.y - scroll < viewH - 60) {
          await tap(page, node.x, node.y);
          break;
        }
        await page.keyboard.press('PageUp');
        await page.waitForTimeout(80);
      }
      await waitScene(page, 'play');
      await play(page, moves);
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'jam');
      await settle(page);
      await check(page, 'jam panel with +1 slot');
      if (shots) await page.screenshot({ path: `${shots}/bounds/${name}-jam.png` });
      const jam = await mix<{ continue: { x: number; y: number } | null }>(page, 'jamButtons');
      await tap(page, jam.continue!.x, jam.continue!.y);
      await page.waitForFunction(() => (window as unknown as { __mix: { overlay: string | null } }).__mix.overlay === null);
      await check(page, 'level after +1 slot');
    });
  });
}
