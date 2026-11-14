import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { dismissTip, mix, openLevel, play, waitScene } from './helpers';

/**
 * A frozen pixel reads as ice and says how many hits break it (#150, finding F6 of the playtest of #69): a pane with a
 * dark rim, two glints and a counter. The counter follows the ice — one per frozen pixel, gone once its ice breaks —
 * and the ice tip draws the same counter. With EVIDENCE set, each step leaves a screenshot in docs/test-evidence/150-*.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE;
const DIR = '150-ghiaccio';
/** Level 31: the first frozen pixels (two), where the ice tip opens. */
const ICE_DEBUT = 31;

async function start(page: Page, unseen: string[], level: number) {
  const value = { sound: false, language: 'it', seenTips: ALL_TIPS.filter((t) => !unseen.includes(t)), unlocked: level, completed: Array.from({ length: level - 1 }, (_, i) => i + 1) };
  await page.addInitScript(([key, v]) => localStorage.setItem(key, v), [KEY, JSON.stringify(value)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

const counters = (page: Page) => mix<Record<string, string>>(page, 'iceCounters');

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  const tag = `${size.width}x${size.height}`;
  const shot = (page: Page, name: string) => evidence ? page.screenshot({ path: `docs/test-evidence/${DIR}/${name}-${tag}.png` }) : Promise.resolve();

  test.describe(`on a ${tag} phone`, () => {
    test.use({ viewport: size });

    test('the ice tip and the board show a counter on every frozen pixel, and it goes when the ice breaks', async ({ page }) => {
      test.setTimeout(120_000);
      await start(page, ['ice'], ICE_DEBUT);
      await openLevel(page, ICE_DEBUT);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'ice');
      await shot(page, '01-scheda-ghiaccio');
      expect(await dismissTip(page)).toBe('ice');

      const ice = await mix<number>(page, 'ice');
      expect(ice).toBe(2);
      expect(Object.values(await counters(page))).toEqual(['1', '1']);
      await shot(page, '02-ghiaccio-con-contatore');

      // Play the solver's line one move at a time: the counters always match the frozen pixels.
      const solution = await mix<Move[]>(page, 'solution');
      let firstBreakShot = false;
      for (const move of solution) {
        await play(page, [move]);
        const left = await mix<number>(page, 'ice');
        expect(Object.keys(await counters(page))).toHaveLength(left);
        if (left < ice && !firstBreakShot) {
          firstBreakShot = true;
          await shot(page, '03-ghiaccio-rotto');
        }
        if ((await mix<string>(page, 'status')) !== 'playing') break;
      }
      expect(firstBreakShot).toBe(true);
      expect(await counters(page)).toEqual({});
    });

    test('ice on level 81 keeps its counters next to stones and hidden pixels', async ({ page }) => {
      await start(page, ['stone'], 81);
      await openLevel(page, 81);
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'stone');
      expect(await dismissTip(page)).toBe('stone');
      const ice = await mix<number>(page, 'ice');
      expect(ice).toBeGreaterThan(0);
      expect(Object.values(await counters(page))).toEqual(Array.from({ length: ice }, () => '1'));
      await shot(page, '04-ghiaccio-livello-81');
    });
  });
}
