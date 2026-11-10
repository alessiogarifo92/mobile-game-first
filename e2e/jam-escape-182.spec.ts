import { expect, test, type Page } from '@playwright/test';
import { translate } from '../src/core/i18n';
import { LAST_LEVEL, checkOnScreen, mix, openLevel, play, waitScene } from './helpers';

/**
 * #182 N2: while a "!" warns of a jam, the line under the title says how to get out of it, and a gold ring marks the
 * bucket to launch first when one would not come back. With EVIDENCE set, each case leaves a screenshot in
 * docs/test-evidence/182-uscita-ingorgo/.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE;
type Escape = { kind: string; from?: string; index?: number; key: string } | null;
const escape = (page: Page) => mix<Escape>(page, 'escape');

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  test.describe(`on a ${size.width}x${size.height} phone`, () => {
  test.use({ viewport: size });
  for (const language of ['it', 'en'] as const) {
    const tag = `${language}-${size.width}x${size.height}`;
    test(`a "!" comes with the way out of the jam (${tag})`, async ({ page }) => {
      test.setTimeout(120_000);
      const save = { unlocked: LAST_LEVEL, completed: [], sound: false, language, seenTips: ALL_TIPS };
      await page.addInitScript(([key, v]) => localStorage.setItem(key, v), [KEY, JSON.stringify(save)] as const);
      await page.goto('/');
      await waitScene(page, 'menu');
      // Level 13: after the first column runs dry, its last bucket waits with "↩6!" in one of two slots (found offline).
      await openLevel(page, 13);
      const title = await mix<string>(page, 'subtitle');
      expect(await escape(page)).toBeNull(); // no "!" at the start, the subtitle keeps the level name
      await play(page, [0, 0, 0, 0].map((index) => ({ from: 'column' as const, index })));
      await page.waitForFunction(() => (window as unknown as { __mix: { escape: unknown } }).__mix.escape !== null, null, { timeout: 60_000 });
      const e = (await escape(page))!;
      expect((await mix<string[]>(page, 'leftoverHints')).some((h) => h.endsWith('!'))).toBe(true);
      expect(await mix<string>(page, 'subtitle')).toBe(translate(language, e.key));
      // Here the waiting bucket would come back, a column one would not: the line and the ring point to that column.
      expect(e).toMatchObject({ kind: 'empty', from: 'column', key: 'escape.column' });
      await checkOnScreen(page, `escape ${tag}`);
      if (evidence) await page.screenshot({ path: `docs/test-evidence/182-uscita-ingorgo/01-via-di-uscita-${tag}.png` });

      // Launching the bucket it points to ends the warning or changes it; once no "!" shows, the level name is back.
      await play(page, [{ from: 'column', index: e.index! }]);
      await page.waitForFunction((t) => {
        const m = (window as unknown as { __mix: { escape: unknown; subtitle: string; leftoverHints: string[] } }).__mix;
        return m.escape === null ? m.subtitle === t : true;
      }, title);
      expect([title, ...['escape.column', 'escape.slot', 'escape.extraSlot', 'escape.order'].map((k) => translate(language, k))])
        .toContain(await mix<string>(page, 'subtitle'));
    });
  }
  });
}
