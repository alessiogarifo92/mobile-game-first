import { expect, test, type Page } from '@playwright/test';
import levels from '../src/levels/levels.json' with { type: 'json' };
import type { Move } from '../src/core/solver';
import { checkOnScreen, dismissTip, mix, openLevel, play, shots, tap, waitScene, waitSim, type Rect } from './helpers';

/**
 * Covered buckets (#97) on their debut level, served after the shipped game by the build `--mode covered-debut`
 * (vite.config.ts): the same level that will open the mechanic at 241, renumbered to follow the shipped levels.
 */
test.use({ baseURL: 'http://localhost:4175' });

const shipped = levels.length;
const debut = shipped + 1;
const KEY = 'mix-and-splash/progress/v1';
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt'];
type Colors = (number | null)[][];

async function start(page: Page) {
  const all = Array.from({ length: shipped }, (_, i) => i + 1);
  const save = { unlocked: debut, completed: all, sound: false, language: 'en', seenTips: TIPS };
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify(save)] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('the debut level explains covered buckets once, then shows a colour when its bucket reaches the top', async ({ page }) => {
  await start(page);
  await openLevel(page, debut);
  expect(await mix(page, 'levelId')).toBe(debut);

  // The one-time tip opens on its own at the debut level.
  await page.waitForFunction(() => (window as unknown as { __mix: { tip: string | null } }).__mix.tip === 'covered');
  if (shots) await page.screenshot({ path: `${shots}/01-suggerimento-secchiello-coperto.png` });
  await checkOnScreen(page, 'covered tip');
  expect(await dismissTip(page)).toBe('covered');
  if (shots) await page.screenshot({ path: `${shots}/02-colonne-con-coperti.png` });

  // Every column shows its front colour; the covered buckets behind it show none.
  const colors = await mix<Colors>(page, 'queueColors');
  expect(colors.every((c) => c[0] !== null)).toBe(true);
  const column = colors.findIndex((c) => c[1] === null);
  expect(column).toBeGreaterThanOrEqual(0);
  const covered = await mix<number>(page, 'covered');
  expect(covered).toBeGreaterThan(0);
  expect(await mix(page, 'reveals')).toBe(0);

  // Launch the bucket in front of a covered one: the covered bucket moves up and shows its colour.
  const r = (await mix<Rect[]>(page, 'columns'))[column]!;
  await tap(page, r.x + r.w / 2, r.y + 40);
  await page.waitForFunction((c) => {
    const m = (window as unknown as { __mix: { queueColors: (number | null)[][]; reveals: number } }).__mix;
    return m.reveals === 1 && m.queueColors[c]![0] !== null;
  }, column);
  expect(await mix(page, 'covered')).toBe(covered - 1);
  await page.waitForTimeout(500); // the reveal turn (420 ms) is over
  if (shots) await page.screenshot({ path: `${shots}/03-scoperta-in-cima.png` });

  // The level plays to the end with the solver's moves: covering changes no rule. No tip comes back.
  await tap(page, 660, 64); // ⟲ retry: a fresh start from the same level
  await waitSim(page, () => (window as unknown as { __mix: { moves: number; tick: number } }).__mix.moves === 0);
  expect(await mix(page, 'tip')).toBeNull();
  await page.waitForTimeout(500);
  expect(await mix(page, 'tip')).toBeNull();
  await play(page, await mix<Move[]>(page, 'solution'));
  await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
  if (shots) await page.screenshot({ path: `${shots}/04-vittoria.png` });
  const saved = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), KEY);
  expect(saved.seenTips).toContain('covered');
});
