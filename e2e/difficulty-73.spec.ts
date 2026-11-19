import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import difficulty from '../src/levels/difficulty.json' with { type: 'json' };
import type { LevelDef } from '../src/core/level';
import type { Move } from '../src/core/solver';
import { translate } from '../src/core/i18n';
import { LAST_LEVEL, PANEL_ARM_WAIT, checkOnScreen, jamSequence, mix, openLevel, play, shots, tap, tapLevel, waitMapSettled, waitScene, waitSim } from './helpers';

/**
 * #73 (direction A, docs/design/73-difficolta-ui.md): a hard level carries a diamond on the map and "◆ Hard" under its title,
 * a boss carries "★ Boss" and nothing else, easy and normal levels show nothing, and the jam panel of a hard level adds one
 * line of comfort once three defeats in a row have offered the hint. With SHOTS_DIR set, screenshots land there.
 */
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover', 'map'];
const band = new Map((difficulty.levels as { id: number; band: string }[]).map((l) => [l.id, l.band]));
const isBoss = (id: number) => (levels as LevelDef[])[id - 1]?.boss === true;
const ids = (levels as LevelDef[]).slice(0, LAST_LEVEL).map((l) => l.id);
const hardIds = ids.filter((id) => band.get(id) === 'hard' && !isBoss(id));
type Node = { id: number; mark: 'boss' | 'hard' | null; unlocked: boolean };
type Mix = { scene: string; overlay: string | null; moves: number };

async function start(page: Page, save: Record<string, unknown>) {
  await page.addInitScript(([k, v]) => { if (!sessionStorage.getItem('seeded')) { sessionStorage.setItem('seeded', '1'); localStorage.setItem(k!, v!); } }, [KEY, JSON.stringify({ sound: false, seenTips: ALL_TIPS, ...save })]);
  await page.goto('/');
  await waitScene(page, 'menu');
}

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('the map marks exactly the hard levels and the bosses, and still scrolls and opens a level', async ({ page }) => {
      await start(page, { unlocked: LAST_LEVEL, completed: ids.slice(0, 72), language: 'it' });
      const nodes = await mix<Node[]>(page, 'nodes');
      expect(nodes.length).toBeGreaterThanOrEqual(LAST_LEVEL);
      for (const n of nodes.filter((x) => x.id <= LAST_LEVEL)) {
        const expected = isBoss(n.id) ? 'boss' : band.get(n.id) === 'hard' ? 'hard' : null;
        expect(n.mark, `level ${n.id}`).toBe(expected);
      }
      expect(nodes.some((n) => n.mark === 'hard')).toBe(true);
      expect(nodes.some((n) => n.mark === null)).toBe(true);
      await waitMapSettled(page);
      if (shots) await page.screenshot({ path: `${shots}/73-01-mappa-${size.width}x${size.height}.png` });
      // The marks add no tap target: scrolling by real drags still works and a marked node opens its level.
      const before = await mix<number>(page, 'scrollY');
      await tapLevel(page, 74);
      await waitScene(page, 'play');
      expect(before).not.toBeUndefined();
      expect(await mix<string>(page, 'subtitle')).toBe(`◆ ${translate('it', 'diff.hard')}  ·  ${await mix<string>(page, 'subtitle').then((s) => s.split('  ·  ')[1])}`);
    });

    test('in play: a hard level says "Hard", a boss says "Boss", and an easy or normal level says nothing', async ({ page }) => {
      const hard = hardIds.at(-1)!;
      const easy = ids.find((id) => band.get(id) === 'easy' && !isBoss(id) && id > 3)!;
      const normal = ids.find((id) => band.get(id) === 'normal' && !isBoss(id))!;
      const boss = ids.filter(isBoss).at(-1)!;
      await start(page, { unlocked: LAST_LEVEL, completed: ids.slice(0, LAST_LEVEL - 1), language: 'en' });
      const seen: Record<string, string> = {};
      for (const [name, id] of Object.entries({ hard, easy, normal, boss })) {
        await openLevel(page, id);
        seen[name] = await mix<string>(page, 'subtitle');
        if (name === 'hard' || name === 'boss') {
          await checkOnScreen(page, `${name} level ${id}`);
          if (shots) await page.screenshot({ path: `${shots}/73-02-gioco-${name}-${size.width}x${size.height}.png` });
        }
        await page.goto('/');
        await waitScene(page, 'menu');
      }
      expect(seen.hard).toMatch(/^◆ Hard {2}· {2}\S/);
      expect(seen.boss).toMatch(/^★ Boss {2}· {2}\S/);
      expect(seen.boss).not.toContain('Hard');
      expect(seen.easy).not.toMatch(/[◆★]|Hard|Easy|Boss/);
      expect(seen.normal).not.toMatch(/[◆★]|Hard|Easy|Boss/);
    });
  });
}

// A hard level with a short way into a jam keeps the three defeats quick.
const jammers = hardIds.map((id) => ({ id, moves: jamSequence((levels as LevelDef[])[id - 1]!) })).filter((c) => c.moves);
const jammer = jammers.sort((a, b) => a.moves!.length - b.moves!.length || a.id - b.id)[0] as { id: number; moves: Move[] } | undefined;
const normalJammer = ids.filter((id) => band.get(id) === 'normal' && !isBoss(id))
  .map((id) => ({ id, moves: jamSequence((levels as LevelDef[])[id - 1]!) })).filter((c) => c.moves)[0] as { id: number; moves: Move[] };

test.describe('jam panel comfort', () => {
  test.use({ viewport: { width: 360, height: 640 } });
  test.setTimeout(180_000);

  for (const language of ['it', 'en'] as const) {
    test(`a hard level shows the comfort line only from the third defeat on (${language})`, async ({ page }) => {
      expect(jammer, 'a hard level of universe 1 that can jam').toBeDefined();
      await start(page, { unlocked: LAST_LEVEL, completed: [], language });
      await openLevel(page, jammer!.id);
      for (let defeat = 1; defeat <= 3; defeat++) {
        await play(page, jammer!.moves);
        await waitSim(page, () => (window as unknown as { __mix: Mix }).__mix.overlay === 'jam');
        const comfort = await mix<number | null>(page, 'jamComfort');
        expect(comfort === null, `defeat ${defeat}`).toBe(defeat < 3);
        const buttons = await mix<{ continue: { x: number; y: number } | null; hint: { x: number; y: number } | null; retry: { x: number; y: number } }>(page, 'jamButtons');
        await checkOnScreen(page, `jam ${defeat} ${language}`);
        // The panel's buttons keep their size (at least 44 CSS px: 88 logical units at 360 px wide) when the line is added.
        const zones = (await page.evaluate(() => window.__mixBounds!())).filter((o) => o.type === 'Zone' && o.depth >= 10);
        expect(zones.length).toBeGreaterThan(0);
        for (const z of zones) expect(Math.min(z.w, z.h), `button ${Math.round(z.x)},${Math.round(z.y)}`).toBeGreaterThanOrEqual(80);
        if (defeat === 3) {
          const text = translate(language, 'diff.jamHard');
          const drawn = (await page.evaluate(() => window.__mixBounds!())).some((o) => o.text === text || (o.text ?? '').startsWith(text.slice(0, 20)));
          expect(drawn, 'the comfort line is drawn').toBe(true);
          expect(buttons.hint).not.toBeNull();
          if (shots) await page.screenshot({ path: `${shots}/73-03-ingorgo-conforto-${language}.png` });
          break;
        }
        await page.waitForTimeout(PANEL_ARM_WAIT);
        await tap(page, buttons.retry.x, buttons.retry.y);
        await page.waitForFunction(() => { const m = (window as unknown as { __mix: Mix }).__mix; return m.scene === 'play' && m.overlay === null && m.moves === 0; });
      }
    });
  }

  test('a normal level never shows it, even after three defeats', async ({ page }) => {
    await start(page, { unlocked: LAST_LEVEL, completed: [], language: 'en', defeats: { [String(normalJammer.id)]: 2 } });
    await openLevel(page, normalJammer.id);
    await play(page, normalJammer.moves);
    await waitSim(page, () => (window as unknown as { __mix: Mix }).__mix.overlay === 'jam');
    expect(await mix<number>(page, 'defeats')).toBe(3);
    expect(await mix<number | null>(page, 'jamComfort')).toBeNull();
  });
});
