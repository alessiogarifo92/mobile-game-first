import { expect, test } from '@playwright/test';
import { dismissTip, mix, openLevel, play, tap, waitScene, waitSim, type Rect } from './helpers';
import type { Move } from '../src/core/solver';

// #177: one teaching card per level (P2), docked under the belt and sized to its content (P3),
// and a line on the stage win that says what the Album holds (P7).
const KEY = 'mix-and-splash/progress/v1';
type Sim = { beltBusy: boolean; status: string; tip: string | null; overlay: string | null };
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'];

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('level 2 shows a single card, under the belt', async ({ page }) => {
      const save = { unlocked: 10, completed: [1], sound: false, language: 'en', seenTips: ALL_TIPS.filter((t) => !['slots', 'leftover'].includes(t)) };
      await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
      await page.goto('/');
      await waitScene(page, 'menu');
      await openLevel(page, 2);
      const moves = await mix<Move[]>(page, 'solution');
      const columns = await mix<Rect[]>(page, 'columns');
      const seen: string[] = [];
      for (const m of moves) {
        const r = m.from === 'column' ? columns[m.index]! : (await mix<Rect[]>(page, 'slots'))[m.index]!;
        await tap(page, r.x + r.w / 2, r.y + 40);
        await waitSim(page, () => { const x = (window as unknown as { __mix: Sim }).__mix; return !x.beltBusy || x.status !== 'playing' || x.tip !== null; });
        const tip = await mix<string | null>(page, 'tip');
        if (!tip) continue;
        const box = await mix<{ y: number; h: number }>(page, 'tipBox');
        const belt = await mix<Rect>(page, 'beltRect');
        const screenH = await mix<number>(page, 'screenHeight');
        expect(box.y).toBeGreaterThanOrEqual(belt.y + belt.h);
        expect(box.y + box.h).toBeLessThanOrEqual(screenH);
        seen.push(tip);
        await dismissTip(page);
        await waitSim(page, () => { const x = (window as unknown as { __mix: Sim }).__mix; return !x.beltBusy || x.status !== 'playing'; });
      }
      expect(seen).toEqual(['slots']);
      // The card that was held back stays unseen, so a later level can teach it.
      const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).seenTips as string[], KEY);
      expect(stored).not.toContain('leftover');
    });

    test('stage win explains the Album', async ({ page }) => {
      test.setTimeout(300_000);
      const save = { unlocked: 10, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9], sound: false, language: 'en', seenTips: ALL_TIPS };
      await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
      await page.goto('/');
      await waitScene(page, 'menu');
      await openLevel(page, 10);
      await play(page, await mix<Move[]>(page, 'solution'));
      await waitSim(page, () => (window as unknown as { __mix: Sim }).__mix.overlay === 'win');
      expect(await mix(page, 'completedStage')).toBe(1);
      expect(await mix(page, 'winHint')).toBe('Tap Album to see every bucket style');
    });
  });
}
