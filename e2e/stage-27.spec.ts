import { expect, test, type Page } from '@playwright/test';
import type { Move } from '../src/core/solver';
import { dismissTip, mix, openLevel, play, shots, waitScene, waitSim } from './helpers';

/** Stage 27 "Circo" (#205): the map shows the stage after level 260; levels 261 and 262 play to a win. */
const KEY = 'mix-and-splash/progress/v1';
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const TIPS = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'hidden', 'belt', 'brown', 'stone', 'queue', 'leftover', 'lock', 'covered'];

async function start(page: Page, save: object) {
  await page.addInitScript(([key, value]) => localStorage.setItem(key, value), [KEY, JSON.stringify({ sound: false, language: 'it', seenTips: TIPS, ...save })] as const);
  await page.goto('/');
  await waitScene(page, 'menu');
}

test('after stage 26 the map of universe 3 adds stage 27 with only level 261 playable', async ({ page }) => {
  await start(page, { unlocked: 261, completed: range(1, 260) });
  expect(await mix(page, 'universe')).toBe(3);
  const headers = await mix<{ stage: number; count: number }[]>(page, 'headers');
  expect(headers.slice(0, 7).map((h) => [h.stage, h.count])).toEqual([[21, 10], [22, 10], [23, 10], [24, 10], [25, 10], [26, 10], [27, 10]]);
  const nodes = await mix<{ id: number; unlocked: boolean; boss: boolean }[]>(page, 'nodes');
  const mine = nodes.filter((n) => n.id <= 270);
  expect(mine.map((n) => n.id)).toEqual(range(201, 270));
  expect(mine.filter((n) => n.unlocked).map((n) => n.id)).toEqual(range(201, 261));
  expect(mine.filter((n) => n.boss).map((n) => n.id)).toEqual([210, 220, 230, 240, 250, 260, 270]);
  if (shots) await page.screenshot({ path: `${shots}/01-mappa-stage-27.png` });
});

for (const [id, name, shot] of [[261, 'the balloon', '02-palloncino-vinto'], [262, 'the clown hat', '03-cappello-vinto']] as const) {
  test(`level ${id}, ${name}, has covered buckets, keys and locks and plays to a win`, async ({ page }) => {
    test.setTimeout(180_000);
    await start(page, { unlocked: id, completed: range(1, id - 1) });
    await openLevel(page, id);
    expect(await mix(page, 'levelId')).toBe(id);
    expect(await mix<number>(page, 'covered')).toBeGreaterThan(0);
    expect(await mix<number>(page, 'locked')).toBeGreaterThan(0);
    expect(await dismissTip(page)).toBeNull();
    expect(await play(page, await mix<Move[]>(page, 'solution'))).toEqual([]);
    await waitSim(page, () => (window as unknown as { __mix: { overlay: string } }).__mix.overlay === 'win');
    expect(await mix(page, 'locked')).toBe(0);
    expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).completed, KEY)).toContain(id);
    if (shots) await page.screenshot({ path: `${shots}/${shot}.png` });
  });
}
