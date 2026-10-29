import { describe, expect, it } from 'vitest';
import debut from '../e2e/fixtures/covered-debut.json' with { type: 'json' };
import { COVERED_DEBUT } from '../e2e/fixtures/covered-debut';
import { coverShooters, generateLevel } from '../src/core/generator';
import { LevelError, parseLevel, type LevelDef, type ShooterSpec } from '../src/core/level';
import { tipOnLevelStart } from '../src/core/onboarding';
import { createRng } from '../src/core/rng';
import { colorShown } from '../src/core/rules';
import { createGame, launchFromColumn, step } from '../src/core/sim';
import { levelWinRate, solve } from '../src/core/solver';
import { BLUE, RED, YELLOW } from './helpers';

const def = (columns: ShooterSpec[][]): LevelDef => ({ id: 1, name: 'test', stage: 1, image: ['RRB'], columns, slots: 3, beltCapacity: 3 });
const uncover = (d: LevelDef): LevelDef => ({ ...d, columns: d.columns.map((c) => c.map(({ color, ammo }) => ({ color, ammo }))) });

describe('covered buckets: level format', () => {
  it('accepts covered buckets behind the front and keeps their colour in the data', () => {
    const level = parseLevel(def([[{ color: RED, ammo: 1 }, { color: RED, ammo: 1, covered: true }], [{ color: BLUE, ammo: 1, covered: false }]]));
    expect(level.columns[0]![1]).toEqual({ color: RED, ammo: 1, covered: true });
  });

  it('rejects a covered front bucket: it would hide nothing', () => {
    expect(() => parseLevel(def([[{ color: RED, ammo: 2 }], [{ color: BLUE, ammo: 1, covered: true }]]))).toThrow(
      new LevelError('the first bucket of column 1 cannot be covered'),
    );
  });

  it('rejects a covered flag that is not a boolean', () => {
    const bad = def([[{ color: RED, ammo: 1 }, { color: RED, ammo: 1, covered: 'yes' as unknown as boolean }], [{ color: BLUE, ammo: 1 }]]);
    expect(() => parseLevel(bad)).toThrow('covered must be true or false (column 0, bucket 1)');
  });

  it('needs no extra paint: ammo still has to match the image exactly', () => {
    expect(() => parseLevel(def([[{ color: RED, ammo: 1 }, { color: RED, ammo: 2, covered: true }], [{ color: BLUE, ammo: 1 }]]))).toThrow('ammo for color 1');
  });
});

describe('covered buckets: rule', () => {
  it('shows a covered colour only from the front of the column', () => {
    expect(colorShown({ covered: true }, 1)).toBe(false);
    expect(colorShown({ covered: true }, 2)).toBe(false);
    expect(colorShown({ covered: true }, 0)).toBe(true);
    expect(colorShown({ covered: false }, 2)).toBe(true);
    expect(colorShown({}, 1)).toBe(true);
  });

  it('reveals a covered bucket when the one in front of it is launched, and the game plays it as usual', () => {
    const level = parseLevel(def([[{ color: RED, ammo: 1 }, { color: RED, ammo: 1, covered: true }], [{ color: BLUE, ammo: 1 }]]));
    const g = createGame(level);
    expect(g.queues[0]!.map((s, k) => colorShown(s, k))).toEqual([true, false]);
    launchFromColumn(g, 0);
    expect(g.queues[0]!.map((s, k) => colorShown(s, k))).toEqual([true]);
    expect(g.queues[0]![0]).toMatchObject({ color: RED, covered: true });
    while (g.belt.length + g.pending.length > 0) step(g);
    launchFromColumn(g, 0);
    launchFromColumn(g, 1);
    for (let i = 0; i < 100 && g.status === 'playing'; i++) step(g);
    expect(g.status).toBe('won');
  });

  it('changes nothing for the solver and the difficulty probe: they know every colour', () => {
    const covered = parseLevel(debut as LevelDef);
    const plain = parseLevel(uncover(debut as LevelDef));
    expect(solve(covered)).toEqual(solve(plain));
    expect(levelWinRate(covered)).toBe(levelWinRate(plain));
  });
});

describe('covered buckets: generator', () => {
  const columns: ShooterSpec[][] = [
    [{ color: RED, ammo: 2 }, { color: RED, ammo: 2 }, { color: BLUE, ammo: 2 }],
    [{ color: YELLOW, ammo: 2 }, { color: BLUE, ammo: 2 }],
    [{ color: RED, ammo: 2 }, { color: YELLOW, ammo: 2 }, { color: BLUE, ammo: 2 }],
  ];
  const count = (cols: ShooterSpec[][]) => cols.flat().filter((s) => s.covered).length;

  it('covers round(share × buckets), never a front bucket, without touching the input', () => {
    const out = coverShooters(columns, 0.25, createRng(3));
    expect(count(out)).toBe(2); // 8 buckets × 0.25
    expect(out.every((c) => !c[0]!.covered)).toBe(true);
    expect(out.map((c) => c.map(({ color, ammo }) => ({ color, ammo })))).toEqual(columns);
    expect(count(columns)).toBe(0);
  });

  it('is deterministic for a seed', () => {
    expect(coverShooters(columns, 0.5, createRng(9))).toEqual(coverShooters(columns, 0.5, createRng(9)));
  });

  it('covers nothing at share 0 and everything behind the fronts at the largest share that fits', () => {
    expect(count(coverShooters(columns, 0, createRng(1)))).toBe(0);
    expect(count(coverShooters(columns, 5 / 8, createRng(1)))).toBe(5);
  });

  it('refuses a share out of range or more buckets than sit behind the fronts', () => {
    expect(() => coverShooters(columns, 1.2, createRng(1))).toThrow('covered must be a share between 0 and 1');
    expect(() => coverShooters(columns, -0.1, createRng(1))).toThrow('covered must be a share between 0 and 1');
    expect(() => coverShooters(columns, Number.NaN, createRng(1))).toThrow('covered must be a share between 0 and 1');
    expect(() => coverShooters(columns, 1, createRng(1))).toThrow('only 5 buckets behind the front, cannot cover 8');
  });

  it('generates the debut level deterministically: a quarter covered, none at a front, very easy and solvable', () => {
    const a = generateLevel(COVERED_DEBUT);
    expect(a).toEqual(generateLevel(COVERED_DEBUT));
    expect(a.def).toEqual(debut);
    const buckets = a.def.columns.flat();
    expect(count(a.def.columns)).toBe(Math.round(buckets.length * 0.25));
    expect(count(a.def.columns)).toBeGreaterThan(0);
    expect(a.def.columns.every((c) => !c[0]!.covered)).toBe(true);
    expect(a.def.overlay).toBeUndefined(); // covering buckets needs no overlay
    expect(a.winRate).toBeGreaterThanOrEqual(0.95);
    expect(solve(parseLevel(a.def)).solvable).toBe(true);
  });

  it('keeps every front bucket uncovered over many seeds', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const { def: d } = generateLevel({ ...COVERED_DEBUT, seed, winRate: undefined, special: { covered: 0.3 } });
      expect(d.columns.every((c) => !c[0]!.covered)).toBe(true);
    }
  });
});

describe('covered buckets: onboarding', () => {
  it('explains covered buckets the first time they show up, once', () => {
    const level = parseLevel(debut as LevelDef);
    expect(tipOnLevelStart(level, ['mixing'])).toBe('covered');
    expect(tipOnLevelStart(level, ['covered'])).toBeNull();
    expect(tipOnLevelStart(parseLevel(uncover(debut as LevelDef)), [])).toBeNull();
  });
});
