import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 30 "Luna park" (#208): the map shows the last stage of universe 3 after level 290; levels 291 and 292 play to a win. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover', 'lock', 'covered'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after stage 29 the map of universe 3 adds stage 30, the last, with only level 291 playable', async ({ page }) => {
  await start(page, { unlocked: 291, completed: range(1, 290) });
  expect(await mix(page, 'universe')).toBe(3);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.slice(0, 10).map((h) => [h.stage, h.count])).toEqual([[21, 10], [22, 10], [23, 10], [24, 10], [25, 10], [26, 10], [27, 10], [28, 10], [29, 10], [30, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  const mine = nodes.filter((n) => n.id <= 300);
  expect(mine.map((n) => n.id)).toEqual(range(201, 300));
  expect(mine.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(201, 291));
  expect(mine.filter((n) => n.boss).map((n) => n.id)).toEqual([210, 220, 230, 240, 250, 260, 270, 280, 290, 300]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-30.png` });
});

for (const [id, name, shot] of [[291, 'the cotton candy', '02-zucchero-filato-vinto'], [292, 'the bumper cars', '03-autoscontro-vinto']] as const) {
  test(`level ${id}, ${name}, has locks and plays to a win`, async ({ page }) => {
    test.setTimeout(180_000);
    await start(page, { unlocked: id, completed: range(1, id - 1) });
    await openLevel(page, id);
    expect(await mix(page, 'levelId')).toBe(id);
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    expect(await dismissTip(page)).toBeNull();
    expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
    await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
    expect(await mix(page, 'locked')).toBe(0);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
    if (shots) await page.screenshot({ path: `${shots}/${shot}.png` });
  });
}
