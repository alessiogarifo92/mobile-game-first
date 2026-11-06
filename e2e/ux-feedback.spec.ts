import { expect, test, type Page } from '@playwright/test';
import { YELLOW } from '../src/core/colors';
import { LAST_LEVEL, dismissTip, mix, openLevel, play, tap, waitScene, waitSim, type Rect } from './helpers';

/**
 * Feedback from the playtest of #69: a waiting bucket that cannot shoot (#146), the "+N" under the columns (#148), the
 * colours a started mixed pixel still needs (#149) and why a bucket comes back (#172). With EVIDENCE set, each step
 * leaves a screenshot in docs/test-evidence/<ticket>-*.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE;

async function start(page: Page, unseen: string[]) {
  const save = { unlocked: LAST_LEVEL, completed: [], sound: false, language: 'en', seenTips: ALL_TIPS.filter((t) => !unseen.includes(t)) };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(save)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  const tag = `${size.width}x${size.height}`;
  const shot = (page: Page, dir: string, name: string) =>
    evidence ? page.screenshot({ path: `docs/test-evidence/${dir}/${name}-${tag}.png` }) : Promise.resolve();

  test.describe(`on a ${tag} phone`, () => {
    test.use({ viewport: size });

    test('a waiting bucket that would land nothing shakes, its blockers are circled and the tip explains it (#146)', async ({ page }) => {
      // Level 10: the first blue bucket paints one pixel and comes back; the rest of the blue is walled in by orange.
      await start(page, ['blocked']);
      await openLevel(page, 10);
      expect(await play(page, [{ from: 'column', index: 0 }])).toEqual([]);
      const slots = await mix<Rect[]>(page, 'slots');
      const before = await mix<number>(page, 'moves');
      await tap(page, slots[0]!.x + slots[0]!.w / 2, slots[0]!.y + slots[0]!.h / 2);
      await shot(page, '146-slot-bloccato', '01-pixel-cerchiati'); // before the card covers the circles
      expect(await mix<number>(page, 'blockedTaps')).toBe(1);
      expect(await mix<number>(page, 'moves')).toBe(before); // nothing launched
      expect(await mix<boolean>(page, 'beltBusy')).toBe(false);
      expect(await mix<number[]>(page, 'blockers')).toEqual([88, 93, 94, 97]);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'blocked');
      await shot(page, '146-slot-bloccato', '02-scheda-corsia-bloccata');
      expect(await dismissTip(page)).toBe('blocked');
      // A second tap is refused again, without the card this time.
      await tap(page, slots[0]!.x + slots[0]!.w / 2, slots[0]!.y + slots[0]!.h / 2);
      expect(await mix<number>(page, 'blockedTaps')).toBe(2);
      await page.waitForTimeout(1200);
      expect(await mix<string | null>(page, 'tip')).toBeNull();
    });

    test('a retry right after a blocked tap leaves no circles and restarts the count (#179)', async ({ page }) => {
      await start(page, []);
      await openLevel(page, 10);
      expect(await play(page, [{ from: 'column', index: 0 }])).toEqual([]);
      const slots = await mix<Rect[]>(page, 'slots');
      await tap(page, slots[0]!.x + slots[0]!.w / 2, slots[0]!.y + slots[0]!.h / 2);
      expect(await mix<number>(page, 'blockedTaps')).toBe(1);
      expect((await mix<number[]>(page, 'blockers')).length).toBeGreaterThan(0);
      await tap(page, 660, 64); // ⟲ retry, well inside the 1.6 s the circles last
      await page.waitForFunction(() => (window as unknown as { __mix: { moves: number } }).__mix.moves === 0);
      expect(await mix<number[]>(page, 'blockers')).toEqual([]);
      expect(await mix<number>(page, 'blockedTaps')).toBe(0);
      // The fresh level counts its own refusals from zero.
      expect(await play(page, [{ from: 'column', index: 0 }])).toEqual([]);
      await tap(page, slots[0]!.x + slots[0]!.w / 2, slots[0]!.y + slots[0]!.h / 2);
      expect(await mix<number>(page, 'blockedTaps')).toBe(1);
    });

    test('the first level with "+N" under a column explains it once (#148)', async ({ page }) => {
      await start(page, ['queue']);
      await openLevel(page, 5);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'queue');
      await shot(page, '148-coda-colonne', '01-scheda-coda');
      expect(await dismissTip(page)).toBe('queue');
      await shot(page, '148-coda-colonne', '02-colonne-con-piu');
      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips as string[], KEY);
      expect(saved).toContain('queue');
    });

    test('a half-mixed pixel shows a dot of the colour it still needs (#149)', async ({ page }) => {
      // Level 4: the red bucket goes first, so the orange pixels it reaches are half done and still want yellow.
      await start(page, []);
      await openLevel(page, 4);
      expect(await mix<{ cell: number; colors: number[] }[]>(page, 'missing')).toEqual([]);
      await play(page, [{ from: 'column', index: 0 }]);
      const missing = await mix<{ cell: number; colors: number[] }[]>(page, 'missing');
      expect(missing.length).toBeGreaterThan(0);
      expect(missing.every((m) => m.colors.length === 1 && m.colors[0] === YELLOW)).toBe(true);
      await shot(page, '149-colori-mancanti', '01-puntini-giallo');
    });

    test('the first bucket that paints and still comes back explains why (#172)', async ({ page }) => {
      await start(page, ['leftover']);
      await openLevel(page, 10);
      const columns = await mix<Rect[]>(page, 'columns');
      await tap(page, columns[0]!.x + columns[0]!.w / 2, columns[0]!.y + 40);
      await waitSim(page, () => (window as unknown as { __mix: { tip: string | null } }).__mix.tip !== null);
      expect(await mix<string | null>(page, 'tip')).toBe('leftover');
      await shot(page, '172-perche-torna', '01-scheda-avanzo');
      expect(await dismissTip(page)).toBe('leftover');
      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).seenTips as string[], KEY);
      expect(saved).toContain('leftover');
    });
  });
}
