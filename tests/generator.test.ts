import { describe, expect, it } from 'vitest';
import { generateLevel, placeSpecial, splitAmmo, stoneShield } from '../src/core/generator';
import { parseImage, parseLevel, walledIn } from '../src/core/level';
import { createRng, shuffle } from '../src/core/rng';
import { solve } from '../src/core/solver';

describe('rng', () => {
  it('is reproducible and in [0,1)', () => {
    const a = createRng(42), b = createRng(42);
    const xs = Array.from({ length: 50 }, () => a());
    expect(xs).toEqual(Array.from({ length: 50 }, () => b()));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
  });

  it('shuffle keeps every item and does not mutate the input', () => {
    const input = [1, 2, 3, 4, 5, 6];
    const out = shuffle(input, createRng(1));
    expect(out.slice().sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('splitAmmo', () => {
  it('splits needs into chunks and folds tiny remainders', () => {
    expect(splitAmmo({ 1: 25, 2: 13, 4: 0 }, 10)).toEqual([
      { color: 1, ammo: 10 }, { color: 1, ammo: 10 }, { color: 1, ammo: 5 },
      { color: 2, ammo: 13 },
    ]);
  });

  it('rejects an invalid chunk size', () => {
    expect(() => splitAmmo({ 1: 1, 2: 0, 4: 0 }, 0)).toThrow('ammoChunk');
  });
});

describe('generateLevel', () => {
  const opts = { id: 1, name: 'test', image: ['ROY', 'GBP', 'YOR'], columns: 2, ammoChunk: 2, slots: 3, beltCapacity: 3, seed: 7 };

  it('produces a valid, solvable level', () => {
    const { def } = generateLevel(opts);
    const level = parseLevel(def);
    expect(solve(level).solvable).toBe(true);
    expect(def.columns).toHaveLength(2);
  });

  it('is deterministic for the same seed', () => {
    expect(generateLevel(opts)).toEqual(generateLevel(opts));
  });

  it('throws when no deal is solvable', () => {
    expect(() => generateLevel({ ...opts, attempts: 0 })).toThrow('no solvable deal');
  });

  it('honours the difficulty band and rejects deals outside it', () => {
    const { winRate } = generateLevel({ ...opts, winRate: [0, 1] });
    expect(winRate).toBeGreaterThanOrEqual(0);
    expect(() => generateLevel({ ...opts, attempts: 5, winRate: [1.1, 2] })).toThrow('no solvable deal');
  });
});

describe('generateLevel with a tiny solver budget', () => {
  it('never ships a level the solver could not prove within budget', () => {
    const opts = { id: 1, name: 'test', image: ['ROY', 'GBP', 'YOR'], columns: 2, ammoChunk: 2, slots: 3, beltCapacity: 3, seed: 7 };
    expect(() => generateLevel({ ...opts, attempts: 3, nodeBudget: 1 })).toThrow('no solvable deal');
  });

  it('carries stage and boss into the definition', () => {
    const opts = { id: 10, name: 'test', image: ['RR'], columns: 1, ammoChunk: 2, slots: 1, beltCapacity: 1, seed: 1 };
    expect(generateLevel({ ...opts, stage: 3, boss: true }).def).toMatchObject({ stage: 3, boss: true });
    expect(generateLevel(opts).def).toMatchObject({ stage: 1 });
    expect(generateLevel(opts).def.boss).toBeUndefined();
  });
});

describe('placeSpecial', () => {
  const image = ['RYBR', 'OGPB', 'RBYR', 'Y..B'];

  it('puts ice only on primary pixels and hidden pixels next to a visible one', () => {
    for (let seed = 0; seed < 20; seed++) {
      const overlay = placeSpecial(image, { ice: 4, hidden: 3 }, createRng(seed));
      const flat = overlay.join('');
      const img = image.join('');
      expect(flat.split('').filter((c) => c === 'i')).toHaveLength(4);
      expect(flat.split('').filter((c) => c === 'h')).toHaveLength(3);
      [...flat].forEach((c, i) => {
        if (c === 'i') expect('RYB').toContain(img[i]);
        if (c !== '.') expect(img[i]).not.toBe('.');
        if (c === 'h') {
          const x = i % 4, y = Math.floor(i / 4);
          const around = [[x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]]
            .filter(([a, b]) => a! >= 0 && a! < 4 && b! >= 0 && b! < 4)
            .map(([a, b]) => b! * 4 + a!);
          expect(around.some((n) => img[n] !== '.' && flat[n] !== 'h')).toBe(true);
        }
      });
    }
  });

  it('is deterministic per seed and throws when the image has no room', () => {
    expect(placeSpecial(image, { ice: 2 }, createRng(1))).toEqual(placeSpecial(image, { ice: 2 }, createRng(1)));
    expect(() => placeSpecial(['OG'], { ice: 1 }, createRng(1))).toThrow('primary');
    expect(() => placeSpecial(['R'], { hidden: 1 }, createRng(1))).toThrow('room');
  });

  it('feeds generated overlays into solvable levels with exact ammo', () => {
    const { def } = generateLevel({ id: 1, name: 't', image: ['RRBB', 'RYYB', 'BYYR', 'BBRR'], columns: 2, ammoChunk: 4, slots: 3, beltCapacity: 3, seed: 3, special: { ice: 2, hidden: 2 } });
    expect(def.overlay!.join('')).toMatch(/i.*i|h.*h/);
    expect(solve(parseLevel(def)).solvable).toBe(true);
  });
});

describe('minShooters', () => {
  it('rejects settings that leave too few buckets', () => {
    const opts = { id: 1, name: 't', image: ['RRRR', 'RRRR'], columns: 2, ammoChunk: 8, slots: 2, beltCapacity: 2, seed: 1 };
    expect(() => generateLevel({ ...opts, minShooters: 2 })).toThrow('only 1 shooters');
    expect(generateLevel({ ...opts, ammoChunk: 4, minShooters: 2 }).def.columns.flat()).toHaveLength(2);
  });
});

describe('stoneShield (#147)', () => {
  const shield = (image: string[], cell: number, stoneCells: number[] = []) => {
    const { width, height, targets } = parseImage(image);
    const stones = targets.map((_, i) => stoneCells.includes(i));
    return stoneShield(width, height, targets, cell, stones);
  };

  it('counts the pixels behind the stone, twice when the stone is the first thing a lane meets', () => {
    // '.RR': the row from the left meets the stone first and it hides both pixels; every other lane sees nothing behind.
    expect(shield(['.RR'], 0)).toBe(4);
    // 'R.R': on both rows a pixel stands in front, so each lane counts its one pixel behind once.
    expect(shield(['R.R'], 1)).toBe(2);
  });

  it('skips a lane already cut by a stone in front and stops counting at a stone behind', () => {
    expect(shield(['..R'], 1)).toBe(2);
    expect(shield(['..R'], 1, [0])).toBe(0);
    expect(shield(['.R.R'], 0)).toBe(4);
    expect(shield(['.R.R'], 0, [2])).toBe(2);
  });

  it('scores 0 for a cell that shields nothing, and works without a stone list', () => {
    expect(shield(['...', '.R.', '...'], 0)).toBe(0);
    const { width, height, targets } = parseImage(['.RR']);
    expect(stoneShield(width, height, targets, 0)).toBe(4);
  });

  it('throws on a cell off the board', () => {
    const { width, height, targets } = parseImage(['.RR']);
    expect(() => stoneShield(width, height, targets, -1)).toThrow('off the board');
    expect(() => stoneShield(width, height, targets, 3)).toThrow('off the board');
  });
});

describe('placeSpecial with blocking stones (#147)', () => {
  const stonesOf = (overlay: string[]) => [...overlay.join('')].map((c) => c === 's');

  it('puts the first stone on the cell that shields most', () => {
    const image = ['R..R', '.RR.', 'R..R'];
    const { width, height, targets } = parseImage(image);
    for (let seed = 0; seed < 10; seed++) {
      const overlay = placeSpecial(image, { stone: 1, stonePlacement: 'blocking' }, createRng(seed));
      const cell = stonesOf(overlay).indexOf(true);
      const best = Math.max(...targets.map((t, c) => (t === 0 ? stoneShield(width, height, targets, c) : -1)));
      expect(stoneShield(width, height, targets, cell)).toBe(best);
    }
  });

  it('never walls a pixel in, and throws when only walling cells are left', () => {
    const image = ['...', '.R.', '...'];
    const { width, height, targets } = parseImage(image);
    const overlay = placeSpecial(image, { stone: 3, stonePlacement: 'blocking' }, createRng(1));
    expect(stonesOf(overlay).filter(Boolean)).toHaveLength(3);
    expect(walledIn(width, height, targets, stonesOf(overlay))).toBe(-1);
    expect(() => placeSpecial(image, { stone: 4, stonePlacement: 'blocking' }, createRng(1))).toThrow('not enough empty cells');
  });

  it('is deterministic per seed', () => {
    const image = ['R..R', '.RR.', 'R..R'];
    const special = { stone: 3, stonePlacement: 'blocking' as const };
    expect(placeSpecial(image, special, createRng(4))).toEqual(placeSpecial(image, special, createRng(4)));
  });
});

describe('generateLevel stoneBite (#147)', () => {
  const opts = { id: 1, name: 't', image: ['.RR.', 'RYYR', '.BB.'], columns: 2, ammoChunk: 2, slots: 3, beltCapacity: 3, seed: 5, special: { stone: 2, stonePlacement: 'blocking' as const } };

  it('rejects a share outside [0, 1]', () => {
    for (const stoneBite of [-0.1, 1.5, Number.NaN]) {
      expect(() => generateLevel({ ...opts, stoneBite })).toThrow('stoneBite must be a share between 0 and 1');
    }
  });

  it('rejects deals whose stones do not make the level harder enough, and says so', () => {
    expect(() => generateLevel({ ...opts, attempts: 5, stoneBite: 1 })).toThrow(/no solvable deal.*in band but with stones that do not bite/);
  });

  it('accepts a deal when the stones bite at least the required share', () => {
    const { def } = generateLevel({ ...opts, stoneBite: 0 });
    expect(def.overlay!.join('')).toContain('s');
  });
});
