import { mkdirSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { translate } from '../src/core/i18n';
import { checkOnScreen, dismissTip, mix, openLevel, tap, waitScene } from './helpers';

/**
 * The stone card and How to play page 5 show the same example (#147): a drop that bursts on a stone and leaves the
 * pixel behind blank, and the same pixel painted from the other side. Both screens, both languages, two phones.
 */
const KEY = 'mix-and-splash/progress/v1';
const evidence = 'docs/test-evidence/147-stone-card';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'queue', 'leftover'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];
const LANGS = ['it', 'en'] as const;

mkdirSync(evidence, { recursive: true });

async function start(page: Page, language: string, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value),
    [KEY, JSON.stringify({ sound: false, language, seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

for (const size of SIZES) {
  for (const lang of LANGS) {
    test.describe(`${size.width}x${size.height} ${lang}`, () => {
      test.use({ viewport: size });
      const tag = `${size.width}x${size.height}-${lang}`;

      test('the stone card at level 81 shows the blocked and the painted lane, fully on screen', async ({ page }) => {
        await start(page, lang, { unlocked: 81, completed: range(1, 80) });
        await openLevel(page, 81);
        await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'stone');
        await page.waitForTimeout(400); // the card's entrance settles
        await checkOnScreen(page, `${tag} stone tip card`);
        await page.screenshot({ path: `${evidence}/scheda-pietra-${tag}.png` });
        expect(await dismissTip(page)).toBe('stone');
      });

      test('How to play page 5 explains stones with the same example as the card', async ({ page }) => {
        await start(page, lang, { unlocked: 1, completed: [] });
        const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
        await tap(page, gear.x, gear.y);
        await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
        const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
        await tap(page, buttons.howto!.x, buttons.howto!.y);
        await waitScene(page, 'howto');
        for (let i = 1; i <= 4; i++) {
          await page.keyboard.press('ArrowRight');
          await page.waitForFunction((k) => (window as unknown as { __mix: { page: number } }).__mix.page === k, i);
        }
        await page.waitForTimeout(400); // the page slide settles
        expect(translate(lang, 'howto.5.body')).toMatch(lang === 'it' ? /restano vuoti/ : /stay blank/);
        await checkOnScreen(page, `${tag} how to play page 5`);
        await page.screenshot({ path: `${evidence}/come-si-gioca-5-${tag}.png` });
      });
    });
  }
}
