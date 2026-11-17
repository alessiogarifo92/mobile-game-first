import { expect, test, type Page } from '@playwright/test';
import { PANEL_ARM_WAIT, checkOnScreen, mix, openLevel, play, tap, waitScene, waitSim } from './helpers';
import type { Move } from '../src/core/solver';

/**
 * #153 (finding F9 of the playtest of #69, docs/design/153-ricompensa-stage.md): finishing a stage shows its new bucket
 * style on three jars in the win panel, with "use it now", which puts it on the buckets at once; the Album button still
 * leads to the stage's page. With EVIDENCE set, each case leaves a screenshot in docs/test-evidence/153-ricompensa-stage.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE;
const DIR = 'docs/test-evidence/153-ricompensa-stage';
type Point = { x: number; y: number };
type Buttons = { next: Point; second: Point; use: Point | null };
type Reward = { skin: string; inUse: boolean } | null;
const COPY = {
  en: { use: 'Use it now', stage: 'Stage complete! New bucket style unlocked' },
  it: { use: 'Usalo subito', stage: 'Stage completato! Nuovo stile dei secchielli' },
};

/** Opens level 10 with levels 1-9 done and wins it: stage 1 is complete, and its style ('dots') is the reward. */
async function winStageOne(page: Page, language: 'it' | 'en') {
  const save = { unlocked: 10, completed: [1, 2, 3, 4, 5, 6, 7, 8, 9], sound: false, language, seenTips: ALL_TIPS };
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, 10);
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string | null } }).__mix.overlay === 'win');
  await page.waitForTimeout(PANEL_ARM_WAIT);
}

const storedSkin = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).skin as string, KEY);

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    for (const language of ['it', 'en'] as const) {
      test(`stage win previews the new style and "use it now" applies it (${language})`, async ({ page }) => {
        test.setTimeout(300_000);
        await winStageOne(page, language);
        expect(await mix(page, 'completedStage')).toBe(1);
        expect(await mix<string>(page, 'winText')).toContain(COPY[language].stage);
        expect(await mix<Reward>(page, 'reward')).toEqual({ skin: 'dots', inUse: false });
        expect(await mix(page, 'skin')).toBe('classic');
        const buttons = await mix<Buttons>(page, 'winButtons');
        expect(buttons.use).not.toBeNull();
        // The card, its button and the album hint fit on the screen, in both languages.
        await checkOnScreen(page, `${language} ${size.width}x${size.height} win panel with reward`);
        const drawn = await page.evaluate(() => window.__mixBounds!().filter((o) => o.text).map((o) => o.text));
        expect(drawn).toContain(COPY[language].use);
        if (evidence) await page.screenshot({ path: `${DIR}/${size.width}x${size.height}-${language}-1-reward.png` });

        await tap(page, buttons.use!.x, buttons.use!.y);
        await page.waitForFunction(() => (window as unknown as { __mix: { skin: string } }).__mix.skin === 'dots');
        expect(await mix<Reward>(page, 'reward')).toEqual({ skin: 'dots', inUse: true });
        expect((await mix<Buttons>(page, 'winButtons')).use).toBeNull();
        expect(await storedSkin(page)).toBe('dots');
        await checkOnScreen(page, `${language} ${size.width}x${size.height} win panel, style in use`);
        if (evidence) await page.screenshot({ path: `${DIR}/${size.width}x${size.height}-${language}-2-in-use.png` });

        // The next level's buckets wear it.
        await tap(page, buttons.next.x, buttons.next.y);
        await page.waitForFunction(() => (window as unknown as { __mix: { levelId: number; overlay: string | null } }).__mix.levelId === 11);
        expect(await mix(page, 'skin')).toBe('dots');
        if (evidence) await page.screenshot({ path: `${DIR}/${size.width}x${size.height}-${language}-3-next-level.png` });
      });
    }

    test('the Album button leads to the stage page, where the style can be used', async ({ page }) => {
      test.setTimeout(300_000);
      await winStageOne(page, 'en');
      const buttons = await mix<Buttons>(page, 'winButtons');
      await tap(page, buttons.second.x, buttons.second.y);
      await waitScene(page, 'album');
      expect(await mix(page, 'stage')).toBe(1);
      expect(await mix(page, 'skin')).toBe('dots');
      expect(await mix(page, 'unlocked')).toBe(true);
      expect(await mix(page, 'activeSkin')).toBe('classic');
      expect(await mix<Point | null>(page, 'useButton')).not.toBeNull();
    });
  });
}

test('a level that ends no stage shows no reward card', async ({ page }) => {
  test.setTimeout(120_000);
  const save = { unlocked: 2, completed: [1], sound: false, language: 'en', seenTips: ALL_TIPS };
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, 2);
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string | null } }).__mix.overlay === 'win');
  expect(await mix(page, 'reward')).toBeNull();
  expect((await mix<Buttons>(page, 'winButtons')).use).toBeNull();
});
