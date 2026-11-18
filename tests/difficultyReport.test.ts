import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import levelsJson from '../src/levels/levels.json' with { type: 'json' };

/**
 * Light alignment check (#215): the difficulty report is a manual script (costly Playwright render),
 * so CI never regenerates it. This test only fails when the shipped levels outgrow it, so a stale report is noticed.
 * Fix: `CHROMIUM_PATH=... npx tsx scripts/difficulty-report.ts` and commit docs/reports/curva-difficolta.{json,png}.
 */
describe('difficulty report alignment (#215)', () => {
  const report = JSON.parse(
    readFileSync(new URL('../docs/reports/curva-difficolta.json', import.meta.url), 'utf8'),
  ) as { id: number; stage: number }[];
  const levels = levelsJson as { id: number }[];

  it('covers exactly the levels of levels.json (regenerate docs/reports/curva-difficolta.* when this fails)', () => {
    expect(report.length).toBe(levels.length);
    expect(report.map((r) => r.id)).toEqual(levels.map((l) => l.id));
  });

  it('has a stage on every row, in non-decreasing order', () => {
    const stages = report.map((r) => r.stage);
    expect(stages.every((s) => Number.isInteger(s) && s > 0)).toBe(true);
    expect([...stages].sort((a, b) => a - b)).toEqual(stages);
  });
});
