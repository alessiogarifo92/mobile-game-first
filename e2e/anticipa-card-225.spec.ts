import { expect, test } from '@playwright/test';
import { translate } from '../src/core/i18n';
import { LAST_LEVEL, checkOnScreen, dismissTip, mix, openLevel, waitScene, waitSim, type Rect } from './helpers';

/**
 * #225: the "Why it came back" and "Lane blocked" cards show at the start of the first level where the case can
 * happen, before the first launch, instead of after the first jam. With EVIDENCE set, each case leaves a screenshot in
 * docs/test-evidence/225-anticipa-card/.
 */
const KEY = 'mix-and-splash/progress/v1';
const evidence = process.env.EVIDENCE;
const BASE = ['guide', 'slots', 'belt'];
type Sim = { tip: string | null; scene: string };

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  test.describe(`on a ${size.width}x${size.height} phone`, () => {
    test.use({ viewport: size });
    for (const language of ['it', 'en'] as const) {
      const tag = `${language}-${size.width}x${size.height}`;

      async function start(page: import('@playwright/test').Page, seenTips: string[], level: number) {
        const save = { unlocked: LAST_LEVEL, completed: [1, 2], sound: false, language, seenTips };
        await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
        await page.goto('/');
        await waitScene(page, 'menu');
        await openLevel(page, level);
      }

      for (const [seen, expected, n] of [[BASE, 'leftover', '01-perche-e-tornato'], [[...BASE, 'leftover'], 'blocked', '02-corsia-bloccata']] as const) {
        test(`level 3 opens with the "${expected}" card, before any launch (${tag})`, async ({ page }) => {
          await start(page, [...seen], 3);
          await waitSim(page, () => (window as unknown as { __mix: Sim }).__mix.tip !== null);
          expect(await mix<string | null>(page, 'tip')).toBe(expected);
          const box = await mix<{ y: number; h: number }>(page, 'tipBox');
          const belt = await mix<Rect>(page, 'beltRect');
          const screenH = await mix<number>(page, 'screenHeight');
          expect(box.y).toBeGreaterThanOrEqual(belt.y + belt.h);
          expect(box.y + box.h).toBeLessThanOrEqual(screenH);
          await checkOnScreen(page, `${expected} ${tag}`);
          if (evidence) await page.screenshot({ path: `docs/test-evidence/225-anticipa-card/${n}-${tag}.png` });
          const stored = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).seenTips as string[], KEY);
          expect(stored).not.toContain(expected); // seen only once dismissed
          await dismissTip(page);
          const after = await page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).seenTips as string[], KEY);
          expect(after).toContain(expected);
        });
      }

      test(`level 3 shows nothing once both cards were seen (${tag})`, async ({ page }) => {
        await start(page, [...BASE, 'leftover', 'blocked'], 3);
        await page.waitForTimeout(900);
        expect(await mix<string | null>(page, 'tip')).toBeNull();
      });

      test(`level 2 keeps its single slots card: nothing at its start (${tag})`, async ({ page }) => {
        await start(page, ['guide'], 2);
        await page.waitForTimeout(900);
        expect(await mix<string | null>(page, 'tip')).toBeNull();
      });

      test(`the card text is translated (${tag})`, async () => {
        for (const id of ['leftover', 'blocked']) {
          expect(translate(language, `tip.${id}.title` as never)).not.toContain('tip.');
          expect(translate(language, `tip.${id}.body` as never)).not.toContain('tip.');
        }
      });
    }
  });
}
