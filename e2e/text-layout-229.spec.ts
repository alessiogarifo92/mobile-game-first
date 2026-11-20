import { expect, test, type Page } from '@playwright/test';
import { PANEL_ARM_WAIT, checkOnScreen, mix, openLevel, play, waitScene, waitSim, type Rect } from './helpers';
import type { Move } from '../src/core/solver';

/**
 * #229 (playtest T21, §4): "max 1 secchielli", the "bigger picture" banner covering the level name on levels 296 and 299,
 * and the summary line of the win panel overlapping the stage message (level 300, a stage-ending win). Each case checks
 * that no two texts overlap and nothing leaves the screen. With EVIDENCE set, it leaves screenshots in
 * docs/test-evidence/229-testi-layout.
 */
const KEY = 'mix-and-splash/progress/v1';
const evidence = process.env.EVIDENCE;
const DIR = 'docs/test-evidence/229-testi-layout';
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
type Sim = { overlay: string | null };

/**
 * Every pair of texts that overlap by more than a hair, above `maxY` (the header and banner, or the whole panel).
 * Texts of three characters or fewer are skipped: they are the bucket numbers and symbols, which sit on their jar by design;
 * so are the slots' own label, which stays drawn (dimmed) behind a panel.
 */
async function overlappingTexts(page: Page, maxY = Infinity): Promise<string[]> {
  const objects = (await page.evaluate(() => window.__mixBounds!())).filter((o) => o.text && o.text.length > 3 && !['WAITING', 'ATTESA'].includes(o.text) && o.y + o.h <= maxY && o.w > 0 && o.h > 0);
  const bad: string[] = [];
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i]!, b = objects[j]!;
      const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (w > 2 && h > 2) bad.push(`"${a.text}" overlaps "${b.text}"`);
    }
  }
  return bad;
}

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    for (const language of ['it', 'en'] as const) {
      const tag = `${size.width}x${size.height}-${language}`;

      async function start(page: Page, level: number, completed: number[]) {
        const save = { unlocked: 300, completed, sound: false, language, seenTips: TIPS };
        await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
        await page.goto('/');
        await waitScene(page, 'menu');
        await openLevel(page, level);
      }
      const before = (id: number) => Array.from({ length: id - 1 }, (_, i) => i + 1);

      for (const [id, fact] of [
        [296, { it: 'Quadro più grande', en: 'Bigger picture' }],
        [299, { it: 'Quadro più grande', en: 'Bigger picture' }],
        [290, { it: 'Nastro: max 1 secchiello', en: 'Belt: max 1 bucket' }],
        [300, { it: 'Nastro: max 1 secchiello', en: 'Belt: max 1 bucket' }],
      ] as const) {
        test(`level ${id}: the banner says "${fact[language]}" under the level name, covering nothing (${tag})`, async ({ page }) => {
          await start(page, id, before(id));
          const banner = (await mix<{ fact: string; y: number; h: number } | null>(page, 'banner'))!;
          expect(banner.fact).toBe(fact[language]);
          const bounds = await page.evaluate(() => window.__mixBounds!());
          const name = bounds.filter((o) => o.text && o.y > 80 && o.y < 140 && !o.text.startsWith('Level') && !o.text.startsWith('Livello')).sort((a, b) => a.y - b.y)[0]!;
          // The level name ends above the banner, which ends above the painted picture (the belt's 64 px frame may sit under
          // its lower edge on a tall picture at 360x640: it is decoration, the picture and everything tappable stay clear).
          expect(name.y + name.h).toBeLessThanOrEqual(banner.y);
          const belt = await mix<Rect>(page, 'beltRect');
          expect(banner.y + banner.h).toBeLessThanOrEqual(belt.y + 64);
          expect(await overlappingTexts(page, banner.y + banner.h)).toEqual([]);
          await checkOnScreen(page, `level ${id} ${tag}`);
          if (evidence) await page.screenshot({ path: `${DIR}/after-banner-${id}-${tag}.png` });
        });
      }

      test(`level 300 ends its stage and universe: the summary and the stage message do not overlap (${tag})`, async ({ page }) => {
        test.setTimeout(300_000);
        await start(page, 300, before(300));
        await play(page, await mix<Move[]>(page, 'solution'));
        await waitSim(page, () => (window as unknown as { __mix: Sim }).__mix.overlay === 'win');
        await page.waitForTimeout(PANEL_ARM_WAIT);
        expect(await overlappingTexts(page)).toEqual([]);
        await checkOnScreen(page, `win 300 ${tag}`);
        if (evidence) await page.screenshot({ path: `${DIR}/after-win-300-${tag}.png` });
      });
    }

    test(`level 10 ends stage 1, in Italian, the longest texts: no overlap (${size.width}x${size.height})`, async ({ page }) => {
      test.setTimeout(300_000);
      const save = { unlocked: 10, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9], sound: false, language: 'it', seenTips: TIPS };
      await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
      await page.goto('/');
      await waitScene(page, 'menu');
      await openLevel(page, 10);
      await play(page, await mix<Move[]>(page, 'solution'));
      await waitSim(page, () => (window as unknown as { __mix: Sim }).__mix.overlay === 'win');
      await page.waitForTimeout(PANEL_ARM_WAIT);
      expect(await overlappingTexts(page)).toEqual([]);
      await checkOnScreen(page, `win 10 ${size.width}x${size.height}`);
      if (evidence) await page.screenshot({ path: `${DIR}/after-win-10-${size.width}x${size.height}-it.png` });
    });
  });
}
