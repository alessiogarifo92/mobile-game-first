import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import type { Move } from '../src/core/solver';
import { translate } from '../src/core/i18n';
import { EXTRA_TIPS, HOWTO_PAGES } from '../src/core/howto';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, tap, waitScene, waitSim } from './helpers';

/**
 * The coloured film (#98) on its debut level, served after the shipped game by the build `--mode film-debut`
 * (vite.config.ts): the same level that will open the mechanic at 301, renumbered to follow the shipped levels.
 * One-time card at the debut, the film on the board, torn off by a shot of its colour, the level won; on two phones.
 */
test.use({ baseURL: 'http://localhost:4176' });

const shipped = levels.length;
const debut = shipped + 1;
const KEY = 'mix-and-splash/progress/v1';
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'queue', 'leftover'];
const SIZES = [{ width: 360, height: 640 }, { width: 412, height: 915 }];

async function start(page: Page, language: 'en' | 'it', seen: string[] = TIPS) {
  const all = Array.from({ length: shipped }, (_, i) => i + 1);
  const save = { unlocked: debut, completed: all, sound: false, language, seenTips: seen };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(save)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });
    const tag = `${size.width}x${size.height}`;

    test('the debut level explains the film once, shows it on the board and plays to a win', async ({ page }) => {
      await start(page, 'en');
      await openLevel(page, debut);
      expect(await mix(page, 'levelId')).toBe(debut);

      // The one-time card opens on its own at the debut level, in the player's language.
      await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'film');
      await page.waitForTimeout(400); // the card's entrance settles
      await checkOnScreen(page, `${tag} film tip card`);
      if (shots) await page.screenshot({ path: `${shots}/01-suggerimento-pellicola-${tag}.png` });
      expect(await dismissTip(page)).toBe('film');

      // Two pixels are under a film; nothing has been torn yet.
      expect(await mix(page, 'film')).toBe(2);
      expect(await mix(page, 'filmTears')).toBe(0);
      await page.waitForTimeout(300);
      if (shots) await page.screenshot({ path: `${shots}/02-pellicole-sul-quadro-${tag}.png` });

      // The solver's moves tear both films off (a film takes only its own colour) and win; the card never comes back.
      const moves = await mix<Move[]>(page, 'solution');
      await play(page, moves.slice(0, 2));
      if (shots) await page.screenshot({ path: `${shots}/03-dopo-due-mosse-${tag}.png` });
      await play(page, moves.slice(2));
      await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
      expect(await mix(page, 'film')).toBe(0);
      expect(await mix(page, 'filmTears')).toBe(2);
      if (shots) await page.screenshot({ path: `${shots}/04-vittoria-${tag}.png` });
      const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
      expect(saved.seenTips).toContain('film');
    });
  });
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height} how to play`, () => {
    test.use({ viewport: size });

    test('How to play adds a film page once the card has been seen, with the same example and text', async ({ page }) => {
      await start(page, 'en', [...TIPS, 'film']);
      const gear = await mix<{ x: number; y: number }>(page, 'settingsButton');
      await tap(page, gear.x, gear.y);
      await page.waitForFunction(() => (window as unknown as { __mix: { settingsOpen: boolean } }).__mix.settingsOpen);
      const buttons = await mix<Record<string, { x: number; y: number }>>(page, 'settingsButtons');
      await tap(page, buttons.howto!.x, buttons.howto!.y);
      await waitScene(page, 'howto');
      // The pages after the base ones follow EXTRA_TIPS order, one per seen tip: the film page is the one after the ice.
      const target = HOWTO_PAGES + EXTRA_TIPS.filter((t) => [...TIPS, 'film'].includes(t)).indexOf('film');
      for (let k = 1; k <= target; k++) {
        await page.keyboard.press('ArrowRight');
        await page.waitForFunction((n) => (window as unknown as { __mix: { page: number } }).__mix.page === n, k);
      }
      await page.waitForTimeout(400); // the page slide settles
      expect(await mix(page, 'tip')).toBe('film');
      await checkOnScreen(page, `${size.width}x${size.height} how to play film page`);
      if (shots) await page.screenshot({ path: `${shots}/05-come-si-gioca-pellicola-${size.width}x${size.height}.png` });
    });
  });
}

test('the card is in Italian too', async ({ page }) => {
  await start(page, 'it');
  await openLevel(page, debut);
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'film');
  expect(translate('it', 'tip.film.title')).toBe('Pellicola sul pixel');
  expect(await dismissTip(page)).toBe('film');
});

test('a player who has seen the card is not shown it again', async ({ page }) => {
  await start(page, 'en', [...TIPS, 'film']);
  await openLevel(page, debut);
  await page.waitForTimeout(800);
  expect(await mix(page, 'tip')).toBeNull();
  expect(await mix(page, 'film')).toBe(2);
});
