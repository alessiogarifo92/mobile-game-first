import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { missingWarning, reportAlignment } from '../src/core/reportAlignment';

describe('reportAlignment (#215)', () => {
  it('is aligned when both lists match', () => {
    expect(reportAlignment([1, 2, 3], [1, 2, 3])).toEqual({ stale: [], missing: [] });
  });

  it('flags report ids that no longer exist as stale', () => {
    expect(reportAlignment([1, 2, 3, 4], [1, 2, 3])).toEqual({ stale: [4], missing: [] });
  });

  it('flags levels the report lacks as missing, without calling them stale', () => {
    expect(reportAlignment([1, 2], [1, 2, 3, 4])).toEqual({ stale: [], missing: [3, 4] });
  });

  it('warns with the first ids and the regeneration command, and stays silent when nothing is missing', () => {
    expect(missingWarning([])).toBe('');
    const w = missingWarning([231, 232, 233, 234, 235, 236, 237], 3);
    expect(w).toContain('231, 232, 233 (+4 more)');
    expect(w).toContain('scripts/difficulty-report.ts');
    expect(missingWarning([231])).not.toContain('more');
  });
});

describe('difficulty report vs levels.json (#215)', () => {
  const report = JSON.parse(
    readFileSync(new URL('../docs/reports/curva-difficolta.json', import.meta.url), 'utf8'),
  ) as { id: number }[];
  const { stale, missing } = reportAlignment(report.map((r) => r.id), (levelsJson as { id: number }[]).map((l) => l.id));

  it('has no obsolete entries (fails); missing levels only warn, so stage PRs are never blocked', () => {
    const warning = missingWarning(missing);
    if (warning) console.warn(warning);
    expect(stale).toEqual([]);
  });
});
