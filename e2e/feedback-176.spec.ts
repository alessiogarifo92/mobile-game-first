import { expect, test, type Page } from '@playwright/test';
import { BLUE } from '../src/core/colors';
import type { BlockExample } from '../src/core/blocked';
import type { DrawnBounds } from '../src/game/debug';
import { LAST_LEVEL, dismissTip, mix, openLevel, play, tap, waitScene, waitSim, type Rect } from './helpers';

/**
 * Clearer feedback after the playtest of #174 (#176): the circles of a refused waiting bucket stay and show the colour
 * that opens each pixel (P1), the "↩" tip explains the "!" (P4), ice reads on the board (P5), and the blocked-lane tip
 * draws the bucket just tapped (P8). With EVIDENCE set, each step leaves a screenshot in docs/test-evidence/176-*.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE;
const DIR = '176-feedback-chiarezza';

async function start(page: Page, unseen: string[], language = 'en', save: object = { unlocked: LAST_LEVEL, completed: [] }) {
  const value = { sound: false, language, seenTips: ALL_TIPS.filter((t) => !unseen.includes(t)), ...save };
  await page.addInitScript(([key, v]) => localStorage.setItem(key, v), [KEY, JSON.stringify(value)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

const texts = (page: Page) => page.evaluate(() => (window as unknown as { __mixBounds: () => DrawnBounds[] }).__mixBounds()
  .filter((b) => b.text).map((b) => b.text!));

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  const tag = `${size.width}x${size.height}`;
  const shot = (page: Page, name: string) => evidence ? page.screenshot({ path: `docs/test-evidence/${DIR}/${name}-${tag}.png` }) : Promise.resolve();

  test.describe(`on a ${tag} phone`, () => {
    test.use({ viewport: size });

    test('a refused bucket: circles with the colour that opens them, a tip drawn from that bucket, circles kept until the next tap', async ({ page }) => {
      test.setTimeout(90_000);
      // Level 10: the first blue bucket paints one pixel and comes back; the rest of the blue is walled in by orange.
      await start(page, ['blocked'], 'it');
      await openLevel(page, 10);
      expect(await play(page, [{ from: 'column', index: 0 }])).toEqual([]);
      const slots = await mix<Rect[]>(page, 'slots');
      await tap(page, slots[0]!.x + slots[0]!.w / 2, slots[0]!.y + slots[0]!.h / 2);
      expect(await mix<number>(page, 'blockedTaps')).toBe(1);
      const blockers = await mix<number[]>(page, 'blockers');
      const unlock = await mix<number[][]>(page, 'blockerUnlock');
      expect(blockers.length).toBeGreaterThan(0);
      expect(unlock).toHaveLength(blockers.length);
      // Orange pixels walling in the blue: every circle says which colour opens it, never blue itself.
      expect(unlock.every((u) => u.length > 0 && !u.includes(BLUE))).toBe(true);
      // Best effort: on a loaded runner the screenshot can land after the card (1.8 s); step 03 shows the circles anyway.
      await shot(page, '01-cerchi-con-colore');

      // The tip waits 1.8 s, then draws the refused bucket: a blue shot, a pixel that opens with the colours above.
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'blocked');
      const ex = await mix<BlockExample>(page, 'blockedCase');
      expect(ex.color).toBe(BLUE);
      expect(ex.front.kind).toBe('pixel');
      expect(ex.behind & BLUE).toBe(BLUE);
      expect(await texts(page)).toContain('■→');
      await shot(page, '02-scheda-dal-secchiello');
      expect(await dismissTip(page)).toBe('blocked');

      // Well past the old 1.6 s: the circles are still there, steady, while nothing has changed.
      await page.waitForTimeout(3500);
      expect(await mix<number[]>(page, 'blockers')).toEqual(blockers);
      await shot(page, '03-cerchi-restano');

      // Any tap moves on: a tap on an empty spot of the screen clears them.
      await tap(page, 30, 200);
      expect(await mix<number[]>(page, 'blockers')).toEqual([]);
      expect(await mix<number[][]>(page, 'blockerUnlock')).toEqual([]);
    });

    test('the "↩" tip shows the warning pill and explains the "!" (P4)', async ({ page }) => {
      await start(page, ['leftover'], 'it');
      await openLevel(page, 10);
      const columns = await mix<Rect[]>(page, 'columns');
      await tap(page, columns[0]!.x + columns[0]!.w / 2, columns[0]!.y + 40);
      await waitSim(page, () => (window as unknown as { __mix: { tip: string | null } }).__mix.tip !== null);
      expect(await mix<string | null>(page, 'tip')).toBe('leftover');
      const shown = await texts(page);
      expect(shown).toEqual(expect.arrayContaining(['↩1', '↩1!']));
      expect(shown.some((t) => t.includes('se lo lanci adesso') && t.includes('"!"'))).toBe(true);
      await shot(page, '04-scheda-ritorno-con-punto-esclamativo');
      expect(await dismissTip(page)).toBe('leftover');
    });

    test('ice on level 81 is drawn with its dark rim (P5)', async ({ page }) => {
      await start(page, ['stone'], 'it', { unlocked: 81, completed: Array.from({ length: 80 }, (_, i) => i + 1) });
      await openLevel(page, 81);
      expect(await mix<number>(page, 'ice')).toBeGreaterThan(0);
      expect(await mix<number>(page, 'stones')).toBe(2);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'stone');
      expect(await dismissTip(page)).toBe('stone');
      await shot(page, '05-ghiaccio-e-pietre-81');
    });
  });
}
