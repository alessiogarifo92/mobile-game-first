import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import type { LevelDef } from '../src/core/level';
import type { Move } from '../src/core/solver';
import { translate } from '../src/core/i18n';
import { LAST_LEVEL, PANEL_ARM_WAIT, checkOnScreen, jamSequence, mix, play, tap, tapLevel, waitScene, waitSim } from './helpers';

/**
 * #93: the jam panel says how many pixels were missing and shows them; after three defeats in a row on the same level
 * it offers a free hint, which opens a new attempt with the first move of a solution marked, and that move plays.
 * With EVIDENCE set, each step leaves a screenshot in docs/test-evidence/93-defeat-hint/.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE;
type Point = { x: number; y: number };
type JamButtons = { continue: Point | null; hint: Point | null; retry: Point };
type Mix = { overlay: string | null; moves: number; hintShown: boolean };

/** On the 360x640 map a tap can land while the map still glides after the scroll: tap again, up to three times. */
async function openLevel(page: Page, id: number) {
  for (let i = 0; i < 3; i++) {
    await tapLevel(page, id);
    const opened = await page.waitForFunction(() => (window as unknown as { __mix: { scene: string } }).__mix.scene === 'play', null, { timeout: 3000 })
      .then(() => true, () => false);
    if (opened) return;
  }
  throw new Error(`level ${id} did not open`);
}

/** Plays into the jam and waits for its panel. */
async function jam(page: Page, moves: Move[]) {
  await play(page, moves);
  await waitSim(page, () => (window as unknown as { __mix: Mix }).__mix.overlay === 'jam');
}

// The shortest jam among the first stages keeps the three defeats quick.
const candidates = (levels as LevelDef[]).slice(0, 30).map((d) => ({ d, moves: jamSequence(d) })).filter((c) => c.moves);
const { d: def, moves } = candidates.sort((a, b) => a.moves!.length - b.moves!.length || a.d.id - b.d.id)[0]! as { d: LevelDef; moves: Move[] };

test.use({ viewport: { width: 360, height: 640 } });
for (const language of ['it', 'en'] as const) {
  test(`three defeats bring a free hint whose move plays (${language}-360x640)`, async ({ page }) => {
    test.setTimeout(180_000);
    const save = { unlocked: LAST_LEVEL, completed: [], sound: false, language, seenTips: ALL_TIPS };
    await page.addInitScript(([key, v]) => localStorage.setItem(key, v), [KEY, JSON.stringify(save)] as const);
    await page.goto('/');
    await waitScene(page, 'menu');
    await openLevel(page, def.id);

    for (let defeat = 1; defeat <= 3; defeat++) {
      await jam(page, moves);
      expect(await mix<number>(page, 'defeats')).toBe(defeat);
      const missing = await mix<number[]>(page, 'missingList');
      expect(missing.length).toBeGreaterThan(0);
      expect(await mix<number>(page, 'missingCount')).toBe(missing.length);
      expect(await mix<boolean>(page, 'nearMiss')).toBe(missing.length <= 3);
      const buttons = await mix<JamButtons>(page, 'jamButtons');
      // The hint is not an ad and comes only from the third defeat on; "+1 slot" stays as it was.
      expect(buttons.hint === null).toBe(defeat < 3);
      expect(buttons.continue).not.toBeNull();
      await checkOnScreen(page, `jam ${defeat} ${language}`);
      if (evidence && (defeat === 1 || defeat === 3)) {
        await page.screenshot({ path: `docs/test-evidence/93-defeat-hint/0${defeat === 1 ? 1 : 2}-sconfitta-${defeat}-${language}.png` });
      }
      if (defeat < 3) {
        await page.waitForTimeout(PANEL_ARM_WAIT);
        await tap(page, buttons.retry.x, buttons.retry.y);
        await page.waitForFunction(() => {
          const m = (window as unknown as { __mix: Mix }).__mix;
          return m.overlay === null && m.moves === 0;
        });
        expect(await mix<boolean>(page, 'hintShown')).toBe(false);
      }
    }

    // The hint opens a new attempt on the same level, with the first move marked and the line under the title saying so.
    const hint = (await mix<JamButtons>(page, 'jamButtons')).hint!;
    await page.waitForTimeout(PANEL_ARM_WAIT);
    await tap(page, hint.x, hint.y);
    await page.waitForFunction(() => {
      const m = (window as unknown as { __mix: Mix }).__mix;
      return m.overlay === null && m.moves === 0 && m.hintShown;
    });
    expect(await mix<number>(page, 'levelId')).toBe(def.id);
    expect(await mix<string>(page, 'subtitle')).toBe(translate(language, 'hint.ready'));
    const move = (await mix<Move | null>(page, 'hintMove'))!;
    expect(move).toMatchObject({ from: 'column' });
    await checkOnScreen(page, `hint ${language}`);
    if (evidence) await page.screenshot({ path: `docs/test-evidence/93-defeat-hint/03-aiuto-${language}.png` });

    // The marked move is playable: play() checks the launch counts, and the level goes on (or is won).
    await play(page, [move]);
    expect(await mix<boolean>(page, 'hintShown')).toBe(false);
    expect(['playing', 'won']).toContain(await mix<string>(page, 'status'));
  });
}
