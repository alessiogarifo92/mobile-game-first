import { describe, expect, it } from 'vitest';
import { CURVE, checkCurve, curveLevel, type CurveLevel } from '../src/core/curve';
import { universeOfStage } from '../src/core/universes';
import { parseLevel } from '../src/core/level';

/** Saw-tooth offsets from the stage base, positions 1–10. */
const SHAPE = [0.05, 0, 0, -0.05, 0, 0, -0.05, 0, -0.1, -0.2];

/** A clean game: each universe's stage bases fall linearly from `start` to `end` (stage mean = base − 0.035). */
function game(bases: [number, number][]): CurveLevel[] {
  const out: CurveLevel[] = [];
  bases.forEach(([start, end], u) => {
    for (let s = 0; s < CURVE.stagesPerUniverse; s++) {
      const stage = u * CURVE.stagesPerUniverse + s + 1;
      const base = start + ((end - start) * s) / (CURVE.stagesPerUniverse - 1);
      SHAPE.forEach((d, p) => out.push({
        id: (stage - 1) * 10 + p + 1, stage, boss: p === 9, winRate: base + d,
        shooters: 10, secondaryShare: 0.5, beltCapacity: 2, slots: 3, features: ['mix'],
      }));
    }
  });
  return out;
}
const U1: [number, number] = [0.9, 0.725];
const U2: [number, number] = [0.8, 0.655];
const set = (levels: CurveLevel[], id: number, patch: Partial<CurveLevel>) => levels.map((l) => (l.id === id ? { ...l, ...patch } : l));
const keys = (levels: CurveLevel[]) => checkCurve(levels).map((v) => v.key);

describe('curve rules', () => {
  it('accepts a clean curve over two universes', () => {
    expect(checkCurve(game([U1, U2]))).toEqual([]);
  });

  it('maps stages to universes of ten', () => {
    expect([1, 10, 11, 100].map(universeOfStage)).toEqual([1, 1, 2, 10]);
  });

  it('rule 1: very easy only in the intro, on a universe-1 stage opener or on a debut', () => {
    const g = game([U1, U2]);
    expect(keys(set(g, 5, { winRate: 1 }))).not.toContain('r1 #5');
    expect(keys(set(g, 11, { winRate: 1 }))).not.toContain('r1 #11');
    expect(keys(set(g, 15, { winRate: 0.97 }))).toContain('r1 #15');
    expect(keys(set(g, 15, { winRate: 0.97, features: ['mix', 'ice'] }))).not.toContain('r1 #15');
    expect(keys(set(g, 101, { winRate: 0.97 }))).toContain('r1 #101');
  });

  it('rule 2: rest, steps, hard level and boss follow the saw-tooth', () => {
    const g = game([U1]);
    expect(keys(set(g, 11, { winRate: 0.6 }))).toContain('r2 #11');
    expect(keys(set(g, 14, { winRate: 0.92 }))).toContain('r2 #14');
    expect(keys(set(g, 17, { winRate: 0.92 }))).toContain('r2 #17');
    expect(keys(set(g, 19, { winRate: 0.86 }))).toContain('r2 #19');
    expect(keys(set(g, 20, { winRate: 0.85 }))).toContain('r2 #20');
    expect(keys(set(g, 20, { winRate: 0.85, easyBoss: true }))).not.toContain('r2 #20');
  });

  it('rule 2 and 7 skip an incomplete stage', () => {
    const g = game([U1]).filter((l) => l.stage < 10 || l.id < 95);
    expect(keys(set(g, 94, { winRate: 0.9 }))).toEqual([]);
  });

  it('rule 3: the end of a universe is harder than its start', () => {
    const flat = game([[0.8, 0.8]]);
    expect(keys(flat)).toContain('r3 u1');
  });

  it('rule 4: a universe starts between the end and the start of the previous one', () => {
    expect(keys(game([U1, [0.7, 0.655]]))).toContain('r4 u2');
    expect(keys(game([U1, [0.92, 0.655]]))).toContain('r4 u2');
  });

  it('rule 5: end-of-universe mean and hardest boss stay near the targets', () => {
    expect(keys(game([[0.9, 0.85]]))).toContain('r5 u1');
    const g = game([U1]);
    expect(keys(set(g, 50, { winRate: 0.2 }))).toContain('r5 u1');
  });

  it('rules 3 and 5 wait for a complete universe; rule 5 skips universes past the target table', () => {
    expect(keys(game([[0.8, 0.8]]).filter((l) => l.id !== 100))).toEqual([]);
    const many = game(Array.from({ length: CURVE.universes.length + 1 }, (_, u): [number, number] => [0.9 - u * 0.02, 0.725 - u * 0.02]));
    expect(keys(many).filter((k) => k.startsWith('r5') || k.startsWith('r3'))).toEqual(
      CURVE.universes.slice(1).map((_, i) => `r5 u${i + 2}`),
    );
  });

  it('rule 6 warns about pictures with little mixing from stage 3, except the rest level', () => {
    const g = game([U1]);
    const warn = (id: number) => checkCurve(set(g, id, { secondaryShare: 0.1 })).filter((v) => v.severity === 'warning').map((v) => v.key);
    expect(warn(25)).toEqual(['r6 #25']);
    expect(warn(21)).toEqual([]);
    expect(warn(15)).toEqual([]);
  });

  it('rule 7 warns when a hard level or a boss is long', () => {
    const v = checkCurve(set(set(game([U1]), 19, { shooters: 14 }), 20, { shooters: 14 }));
    expect(v.filter((x) => x.rule === 7)).toMatchObject([
      { key: 'r7 #19', severity: 'warning' },
      { key: 'r7 #20', severity: 'warning' },
    ]);
  });

  it('rule 8: belt 1 or slots 1 only on a boss from universe 3, one at a time and by one', () => {
    const g = game([U1, U2, U1]);
    expect(keys(set(g, 15, { beltCapacity: 1 }))).toContain('r8 #15');
    expect(keys(set(g, 110, { slots: 1 }))).toContain('r8 #110');
    expect(keys(set(g, 210, { beltCapacity: 1 }))).not.toContain('r8 #210');
    expect(keys(set(g, 210, { slots: 1 }))).not.toContain('r8 #210');
    expect(keys(set(g, 210, { beltCapacity: 1, slots: 1 }))).toContain('r8 #210');
    expect(keys(set(g, 210, { slots: 0 }))).toContain('r8 #210');
  });
});

describe('curveLevel', () => {
  it('reads shooters, mixing share and mechanics from a parsed level', () => {
    const level = parseLevel({
      id: 7, name: 'x', stage: 1, boss: true, image: ['RO'], overlay: ['ih'],
      columns: [[{ color: 1, ammo: 3 }], [{ color: 2, ammo: 1 }]], slots: 3, beltCapacity: 2,
    });
    expect(curveLevel(level, 0.5, true)).toEqual({
      id: 7, stage: 1, boss: true, winRate: 0.5, shooters: 2, secondaryShare: 0.5,
      beltCapacity: 2, slots: 3, features: ['mix', 'ice', 'hidden'], easyBoss: true,
    });
    expect(curveLevel({ ...level, ice: [0, 0], hidden: [false, false], targets: [1, 0] }, 1)).toMatchObject({ features: [], secondaryShare: 0 });
  });

  it('counts a pair with its own debut card as a mechanic of its own, only when both halves are on the board (#268)', () => {
    const both = parseLevel({
      id: 421, name: 'x', stage: 43, image: ['RO'], overlay: ['ib'],
      columns: [[{ color: 1, ammo: 3 }], [{ color: 2, ammo: 1 }], [{ color: 4, ammo: 1 }]], slots: 2, beltCapacity: 2,
    });
    expect(curveLevel(both, 1).features).toEqual(['mix', 'ice', 'film', 'ice+film']);
    expect(curveLevel({ ...both, film: [0, 0] }, 1).features).toEqual(['mix', 'ice']);
    expect(curveLevel({ ...both, ice: [0, 0] }, 1).features).toEqual(['mix', 'film']);
  });

  it('counts ice + tunnel as a pair of its own, apart from ice + film (#270)', () => {
    const both = parseLevel({
      id: 441, name: 'x', stage: 45, image: ['RR', 'RR'], overlay: ['i.', '..'], tunnels: [0],
      columns: [[{ color: 1, ammo: 5 }]], slots: 2, beltCapacity: 2,
    });
    expect(curveLevel(both, 1).features).toEqual(['ice', 'tunnel', 'ice+tunnel']);
    expect(curveLevel({ ...both, tunnels: [] }, 1).features).toEqual(['ice']);
    expect(curveLevel({ ...both, ice: [0, 0, 0, 0] }, 1).features).toEqual(['tunnel']);
  });

  it('counts hidden + film as a pair of its own (#272)', () => {
    const both = parseLevel({
      id: 461, name: 'x', stage: 47, image: ['RR', 'RR'], overlay: ['hb', '..'],
      columns: [[{ color: 1, ammo: 4 }], [{ color: 4, ammo: 1 }]], slots: 2, beltCapacity: 2,
    });
    expect(curveLevel(both, 1).features).toEqual(['hidden', 'film', 'hidden+film']);
    expect(curveLevel({ ...both, film: [0, 0, 0, 0] }, 1).features).toEqual(['hidden']);
    expect(curveLevel({ ...both, hidden: [false, false, false, false] }, 1).features).toEqual(['film']);
  });

  it('counts hidden + tunnel as a pair of its own, apart from hidden + film and ice + tunnel (#274)', () => {
    const both = parseLevel({
      id: 481, name: 'x', stage: 49, image: ['RR', 'RR'], overlay: ['h.', '..'], tunnels: [0],
      columns: [[{ color: 1, ammo: 4 }]], slots: 2, beltCapacity: 2,
    });
    expect(curveLevel(both, 1).features).toEqual(['hidden', 'tunnel', 'hidden+tunnel']);
    expect(curveLevel({ ...both, tunnels: [] }, 1).features).toEqual(['hidden']);
    expect(curveLevel({ ...both, hidden: [false, false, false, false] }, 1).features).toEqual(['tunnel']);
  });

  it('counts all four mechanics of the pairs together as a combination of its own, on top of the four pairs (#275)', () => {
    const all = parseLevel({
      id: 491, name: 'x', stage: 50, image: ['RR', 'RY'], overlay: ['ib', 'h.'], tunnels: [0],
      columns: [[{ color: 1, ammo: 4 }], [{ color: 2, ammo: 1 }, { color: 4, ammo: 1 }]], slots: 2, beltCapacity: 2,
    });
    expect(curveLevel(all, 1).features).toEqual(['ice', 'hidden', 'film', 'tunnel', 'ice+film', 'ice+tunnel', 'hidden+film', 'hidden+tunnel', 'ice+film+hidden+tunnel']);
    // Three of the four are not enough: the finale combination needs every one.
    expect(curveLevel({ ...all, tunnels: [] }, 1).features).not.toContain('ice+film+hidden+tunnel');
    expect(curveLevel({ ...all, ice: all.ice.map(() => 0) }, 1).features).not.toContain('ice+film+hidden+tunnel');
  });

  it('rule 1: a pair debut may be very easy once, the same pair again may not (#268)', () => {
    const g = set(set(game([U1, U2]), 115, { features: ['mix', 'ice', 'film', 'ice+film'], winRate: 0.97 }), 15, { features: ['mix', 'ice', 'film'] });
    expect(keys(g)).not.toContain('r1 #115');
    expect(keys(set(g, 116, { features: ['mix', 'ice', 'film', 'ice+film'], winRate: 0.97 }))).toContain('r1 #116');
    // Ice and film each seen before, never together: without the pair the level is no debut.
    expect(keys(set(g, 115, { features: ['mix', 'ice', 'film'] }))).toContain('r1 #115');
  });
});
