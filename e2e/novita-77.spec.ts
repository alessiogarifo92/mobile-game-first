import { expect, test, type Page } from '@playwright/test';
import { checkOnScreen, mix, openLevel, play, tap, waitScene, type Rect } from './helpers';
import type { Move } from '../src/core/solver';

// #77: a level that makes the game harder than the one before says so once, in a strip under the title that covers
// nothing the player touches.
const KEY = 'mix-and-splash/progress/v1';
const ALL_TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'lock', 'belt', 'brown', 'stone', 'covered', 'queue', 'leftover'];
const evidence = process.env.EVIDENCE; // set it to leave screenshots in docs/test-evidence/77-novita-difficolta
const DIR = 'docs/test-evidence/77-novita-difficolta';
type Banner = { fact: string; why: string; kinds: string[]; y: number; h: number } | null;

async function start(page: Page, level: number, seenTips: string[], language = 'it') {
  const save = { unlocked: level, completed: Array.from({ length: level - 1 }, (_, i) => i + 1), sound: false, language, seenTips };
  await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify(save)]);
  await page.goto('/');
  await waitScene(page, 'menu');
  await openLevel(page, level);
}
const stored = (page: Page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k)!).seenTips as string[], KEY);

for (const size of [{ width: 360, height: 640 }, { width: 412, height: 915 }]) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('level 4 (slots 4→3) shows one strip that covers nothing playable, then never again', async ({ page }) => {
      await start(page, 4, ALL_TIPS);
      const banner = await mix<Banner>(page, 'banner');
      expect(banner?.kinds).toEqual(['slots']);
      expect(banner?.fact).toBe('Slot: 3');
      // Above the board: the belt and everything the player taps stay clear of it.
      const [belt, columns, slots] = await Promise.all([mix<Rect>(page, 'beltRect'), mix<Rect[]>(page, 'columns'), mix<Rect[]>(page, 'slots')]);
      const bottom = banner!.y + banner!.h;
      // #229: the strip hangs under the level name, so its lower edge may sit on the belt's 64 px frame, never on the picture.
      expect(bottom).toBeLessThanOrEqual(belt.y + 64);
      expect(bottom).toBeLessThan(Math.min(slots[0]!.y, columns[0]!.y));
      await checkOnScreen(page, 'level 4 with the strip');
      if (evidence) await page.screenshot({ path: `${DIR}/${size.width}x${size.height}-04-livello-4.png` });
      expect(await stored(page)).toContain('chg.slots.3');
      // A tap on the strip closes it.
      await tap(page, 360, banner!.y + banner!.h / 2);
      expect(await mix(page, 'banner')).toBeNull();
      // Opening the level again (restart): already told, nothing shows.
      const retry = (await page.evaluate(() => window.__mixBounds!())).find((o) => o.text === '⟲')!;
      await tap(page, retry.x + retry.w / 2, retry.y + retry.h / 2);
      await page.waitForFunction(() => window.__mix?.scene === 'play' && window.__mix.moves === 0);
      expect(await mix(page, 'banner')).toBeNull();
    });

    test('a level that changes nothing, or that was already told, shows no strip', async ({ page }) => {
      await start(page, 3, ALL_TIPS);
      expect(await mix(page, 'banner')).toBeNull();
    });

    test('belt and slots going down together are one strip, on level 12', async ({ page }) => {
      await start(page, 12, [...ALL_TIPS, 'chg.slots.3', 'chg.chunk', 'chg.canvas', 'chg.boss', 'chg.belt.4', 'chg.columns'], 'en');
      const banner = await mix<Banner>(page, 'banner');
      expect(banner?.kinds).toEqual(['belt', 'slots']);
      expect(banner?.fact).toBe('Belt: max 3 buckets · Slots: 2');
      await checkOnScreen(page, 'level 12 with the strip');
      if (evidence) await page.screenshot({ path: `${DIR}/${size.width}x${size.height}-12-nastro-e-slot-en.png` });
      const seen = await stored(page);
      expect(seen).toEqual(expect.arrayContaining(['chg.belt.3', 'chg.slots.2']));
    });

    test('the first launch closes the strip and the level plays on', async ({ page }) => {
      await start(page, 4, ALL_TIPS);
      expect((await mix<Banner>(page, 'banner'))?.kinds).toEqual(['slots']);
      const moves = await mix<Move[]>(page, 'solution');
      await play(page, moves.slice(0, 1));
      expect(await mix(page, 'banner')).toBeNull();
      expect(await mix<number>(page, 'moves')).toBe(1);
    });

    test('How to play lists what the player has been told', async ({ page }) => {
      await page.addInitScript(([k, v]) => localStorage.setItem(k!, v!), [KEY, JSON.stringify({ sound: false, language: 'it', unlocked: 1, completed: [], seenTips: ['chg.belt.3', 'chg.slots.2', 'chg.boss'] })]);
      await page.goto('/');
      await waitScene(page, 'menu');
      const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
      await tap(page, gear.x, gear.y);
      await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
      const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
      await tap(page, buttons.howto!.x, buttons.howto!.y);
      await waitScene(page, 'howto');
      const pages = await mix<number>(page, 'pages');
      for (let i = 1; i < pages; i++) await page.keyboard.press('ArrowRight');
      await page.waitForFunction((n) => window.__mix?.page === n - 1, pages);
      await page.waitForTimeout(300);
      expect(await mix(page, 'changes')).toEqual(['belt', 'slots', 'boss']);
      await checkOnScreen(page, 'how to play, changes page');
      if (evidence) await page.screenshot({ path: `${DIR}/${size.width}x${size.height}-howto-novita.png` });
    });
  });
}
