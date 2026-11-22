import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import type { Move } from '../src/core/solver';
import { translate } from '../src/core/i18n';
import { EXTRA_TIPS, HOWTO_PAGES } from '../src/core/howto';
import { ROOF_DEPTH, overlaps } from '../src/core/tunnel';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, tap, waitScene, waitSim, type Rect } from './helpers';

/**
 * The blind lanes (#99) on their debut level, served after the shipped game by the build `--mode tunnel-debut`
 * (vite.config.ts): the same level that will open the mechanic at 341, renumbered to follow the shipped levels.
 * One-time card at the debut, the tunnel on the belt, a bucket riding under it, the level won; on two phones.
 */
test.use({ baseURL: 'http://localhost:4177' });

const shipped = levels.length;
const debut = shipped + 1;
const KEY = 'mix-and-splash/progress/v1';
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'film', 'hidden', 'belt', 'queue', 'leftover'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];

async function start(page: Page, language: 'en' | 'it', seen: string[] = TIPS) {
  const all = Array.from({ length: shipped }, (_, i) => i + 1);
  const save = { unlocked: debut, completed: all, sound: false, language, seenTips: seen };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(save)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

interface Roof { pieces: Rect[]; mouths: Rect[] }

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('the debut level explains the tunnel once, draws it over the belt and plays to a win', async ({ page }) => {
      await start(page, 'en');
      await openLevel(page, debut);
      expect(await mix(page, 'levelId')).toBe(debut);

      // The one-time card opens on its own at the debut level, in the player's language.
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'tunnel');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} tunnel tip card`);
      if (shots) await page.screenshot({ path: `${shots}/01-suggerimento-galleria-${tag}.png` });
      expect(await dismissTip(page)).toBe('tunnel');

      // Six lanes of the belt are blind, and the roof drawn over them stays on the belt: it covers neither the canvas,
      // nor the waiting slots, nor the columns, nor any text or tap zone of the screen.
      expect(await mix<number[]>(page, 'tunnels')).toHaveLength(6);
      const roof = await mix<Roof>(page, 'tunnelRoof');
      expect(roof.pieces.length).toBeGreaterThan(0);
      expect(roof.mouths).toHaveLength(2);
      const belt = await mix<Rect>(page, 'beltRect');
      const canvas = await mix<Rect>(page, 'canvasRect');
      const slots = await mix<Rect[]>(page, 'slots');
      const columns = await mix<Rect[]>(page, 'columns');
      const drawn = await page.evaluate(() => window.__mixBounds!());
      for (const part of [...roof.pieces, ...roof.mouths]) {
        expect(part.x).toBeGreaterThanOrEqual(belt.x - 1e-6);
        expect(part.y).toBeGreaterThanOrEqual(belt.y - 1e-6);
        expect(part.x + part.w).toBeLessThanOrEqual(belt.x + belt.w + 1e-6);
        expect(part.y + part.h).toBeLessThanOrEqual(belt.y + belt.h + 1e-6);
        for (const other of [canvas, ...slots, ...columns]) expect(overlaps(part, other)).toBe(false);
        // What the roof would hide: anything drawn beneath it, bar the full-screen background. The banner and cards open over it.
        const hit = drawn.filter((o) => o.depth < ROOF_DEPTH && o.w > 0 && o.h > 0 && o.w < 720 && overlaps(part, { x: o.x, y: o.y, w: o.w, h: o.h }));
        expect(hit.map((o) => `${o.type} ${o.text ?? ""} ${Math.round(o.x)},${Math.round(o.y)} ${Math.round(o.w)}x${Math.round(o.h)} d${o.depth}`), `${tag}: something drawn under the roof`).toEqual([]);
      }
      await page.waitForTimeout(300);
      await checkOnScreen(page, `${tag} tunnel level`);
      if (shots) await page.screenshot({ path: `${shots}/02-galleria-sul-nastro-${tag}.png` });

      // The solver plays the blind belt to the win. The first bucket rides under the roof while the picture is taken.
      const moves = await mix<Move[]>(page, 'solution');
      expect(moves.length).toBeGreaterThan(0);
      const first = moves[0]!;
      const target = first.from === 'column' ? columns[first.index]! : slots[first.index]!;
      await tap(page, target.x + target.w / 2, target.y + 40);
      await page.waitForFunction(() => (window as unknown as { __mix: { beltBusy: boolean } }).__mix.beltBusy);
      await page.waitForTimeout(500);
      if (shots) await page.screenshot({ path: `${shots}/03-secchiello-in-viaggio-${tag}.png` });
      await waitSim(page, () => !(window as unknown as { __mix: { beltBusy: boolean } }).__mix.beltBusy);
      await play(page, moves.slice(1));
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
      expect(await mix(page, 'painted')).toBe(await mix(page, 'targets'));
      if (shots) await page.screenshot({ path: `${shots}/04-vittoria-${tag}.png` });
      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
      expect(saved.seenTips).toContain('tunnel');
    });
  });
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height} how to play`, () => {
    test.use({ viewport: size });

    test('How to play adds a tunnel page once the card has been seen, with the same example and text', async ({ page }) => {
      await start(page, 'en', [...TIPS, 'tunnel']);
      const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
      await tap(page, gear.x, gear.y);
      await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
      const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
      await tap(page, buttons.howto!.x, buttons.howto!.y);
      await waitScene(page, 'howto');
      // The pages after the base ones follow EXTRA_TIPS order, one per seen tip.
      const target = HOWTO_PAGES + EXTRA_TIPS.filter((t) => [...TIPS, 'tunnel'].includes(t)).indexOf('tunnel');
      for (let k = 1; k <= target; k++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction((n) => (window as unknown as { __mix: { page: number } }).__mix.page === n, k);
      }
      await page.waitForTimeout(400); // the page slide settles
      expect(await mix(page, 'tip')).toBe('tunnel');
      await checkOnScreen(page, `${size.width}x${size.height} how to play tunnel page`);
      if (shots) await page.screenshot({ path: `${shots}/05-come-si-gioca-galleria-${size.width}x${size.height}.png` });
    });
  });
}

test('the card is in Italian too', async ({ page }) => {
  await start(page, 'it');
  await openLevel(page, debut);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'tunnel');
  expect(translate('it', 'tip.tunnel.title')).toBe('Galleria sul nastro');
  if (shots) await page.screenshot({ path: `${shots}/06-suggerimento-galleria-it.png` });
  expect(await dismissTip(page)).toBe('tunnel');
});

test('a player who has seen the card is not shown it again', async ({ page }) => {
  await start(page, 'en', [...TIPS, 'tunnel']);
  await openLevel(page, debut);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect(await mix<number[]>(page, 'tunnels')).toHaveLength(6);
});
