import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, tap, waitScene, waitSim, type Rect } from './helpers';

const KEY = 'mix-and-splash/progress/v1';
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover'];
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'en', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

const won = () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win';

test.describe('win panel ignores taps meant for the slots (#161)', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  test('a tap on a slot right after the win does not leave the level', async ({ page }) => {
    await start(page, { unlocked: 166, completed: range(1, 165) });
    await openLevel(page, 166);
    const solution = await mix<Move[]>(page, 'solution');
    const slots = await mix<Rect[]>(page, 'slots');
    const slot = slots[1]!;
    const panel = await mix<{ second: { x: number; y: number } }>(page, 'winButtons');
    // The panel's "second" button sits on top of this slot: the very case of the bug.
    expect(Math.abs(panel.second.x - (slot.x + slot.w / 2)) < 130 && Math.abs(panel.second.y - (slot.y + slot.h / 2)) < 32).toBe(true);
    // Tap the slot in the same frame the panel shows up (a tap that is "in flight" at the win), from inside the page so
    // a slow runner cannot push it past the arming window.
    const tapped = page.evaluate(([x, y]) => new Promise<number>((resolve) => {
      const canvas = document.querySelector('canvas')!;
      const box = canvas.getBoundingClientRect();
      const k = box.width / 720;
      const start = performance.now();
      const poll = () => {
        if ((window as unknown as { __mix: { overlay: string } }).__mix.overlay !== 'win') return void requestAnimationFrame(poll);
        const init = { bubbles: true, clientX: box.x + x! * k, clientY: box.y + y! * k, button: 0 };
        canvas.dispatchEvent(new MouseEvent('mousedown', init));
        canvas.dispatchEvent(new MouseEvent('mouseup', init));
        resolve(performance.now() - start);
      };
      poll();
    }), [slot.x + slot.w / 2, slot.y + slot.h / 2]);
    await play(page, solution);
    expect(await tapped).toBeGreaterThan(0);
    await page.waitForTimeout(150);
    expect(await mix(page, 'scene')).toBe('play');
    expect(await mix(page, 'overlay')).toBe('win');
    if (shots) await page.screenshot({ path: `${shots}/01-pannello-dopo-tocco-sullo-slot.png` });
    // Its own button still works once the panel is armed.
    await page.waitForTimeout(600);
    const buttons = await mix<{ second: { x: number; y: number } }>(page, 'winButtons');
    await tap(page, buttons.second.x, buttons.second.y);
    await waitScene(page, 'menu');
  });
});

test.describe('stage boss win panel (#155, #154)', () => {
  test.use({ viewport: { width: 412, height: 915 } });

  for (const language of ['it', 'en'] as const) {
    test(`shows name, moves and the stage message (${language})`, async ({ page }) => {
      await start(page, { unlocked: 10, completed: range(1, 9), language });
      await openLevel(page, 10);
      await play(page, await mix<Move[]>(page, 'solution'));
      await waitSim(page, won);
      const text = await mix<string>(page, 'winText');
      expect(text).toMatch(language === 'it' ? /\d+ mosse/ : /\d+ moves/);
      expect(text).toContain(language === 'it' ? 'Stage completato!' : 'Stage complete!');
      expect(text).not.toContain('Mondo');
      if (shots) await page.screenshot({ path: `${shots}/0${language === 'it' ? 2 : 3}-boss-vittoria-${language}.png` });
    });
  }
});

test.describe('map stage headers do not touch their counter (#160)', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  for (const language of ['en', 'it'] as const) {
    test(`every stage of the universe, ${language}`, async ({ page }) => {
      await start(page, { unlocked: 181, completed: range(1, 180), language });
      const seen = new Map<number, { title: { x: number; w: number }; counter: { x: number; w: number } }>();
      await page.mouse.move(180, 320);
      for (let i = 0; i < 40; i++) await page.mouse.wheel(0, -2000); // up to the end of the map, then read it downwards
      await page.waitForTimeout(200);
      let still = 0;
      let shotTaken = false;
      for (let i = 0; i < 120 && still < 3; i++) {
        const objs = await page.evaluate(() => window.__mixBounds!());
        const titles = objs.filter((o) => /^(Stage|Mondo) \d+ ·/.test(o.text ?? ''));
        const counters = objs.filter((o) => /^\d+\/\d+\s+▸/.test(o.text ?? ''));
        const scroll = await mix<number>(page, 'scrollY');
        for (const t of titles) {
          const c = counters.find((o) => Math.abs(o.y + o.h / 2 - (t.y + t.h / 2)) < 10);
          if (c && shots && language === 'en' && /^Stage 19 /.test(t.text!) && t.y - scroll > 500 && t.y - scroll < 900 && !shotTaken && (shotTaken = true)) await page.screenshot({ path: `${shots}/04-mappa-stage19-360x640-en.png` });
          if (c) seen.set(Number(/\d+/.exec(t.text!)![0]), { title: t, counter: c });
        }
        const before = await mix<number>(page, 'scrollY');
        await page.mouse.move(180, 320);
        await page.mouse.wheel(0, 800); // 800 of the 1280 world units on screen: every header is whole in some frame, in ~40 steps (300 took ~105 and timed out on CI)
        await page.waitForTimeout(150);
        still = (await mix<number>(page, 'scrollY')) === before ? still + 1 : 0;
      }
      expect([...seen.keys()].sort((a, b) => a - b)).toEqual([11, 12, 13, 14, 15, 16, 17, 18, 19, 20]);
      for (const [stage, { title, counter }] of seen) {
        expect(title.x + title.w + 8, `stage ${stage}`).toBeLessThanOrEqual(counter.x);
      }
    });
  }
});
