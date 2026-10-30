import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import type { Move } from '../src/core/solver';
import { mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 13 "Prato" (#123): its first level (the daisy, with hidden pixels) plays to a win from the map. */
const KEY = 'mix-and-splash/progress/v1';
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown'];
const first = levels.find((l) => l.stage === 13)!;
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('the first level of stage 13 (Prato) plays to a win', async ({ page }) => {
  test.setTimeout(120_000);
  expect(first).toMatchObject({ id: 121, name: 'daisy' });
  await start(page, { unlocked: first.id, completed: range(1, first.id - 1) });
  await openLevel(page, first.id);
  expect(await mix(page, 'levelId')).toBe(first.id);
  if (shots) await page.screenshot({ path: `${shots}/01-livello-121-margherita.png` });

  const tips = await play(page, await mix<Move[]>(page, 'solution'));
  expect(tips).toEqual([]);
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/02-livello-121-vinto.png` });
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(first.id);
});
