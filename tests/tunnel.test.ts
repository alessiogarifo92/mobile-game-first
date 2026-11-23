import { describe, expect, it } from 'vitest';
import debut from '../e2e/fixtures/tunnel-debut.json' with { type: 'json' };
import { TUNNEL_DEBUT } from '../e2e/fixtures/tunnel-debut';
import { BLUE, RED } from '../src/core/colors';
import { curveLevel } from '../src/core/curve';
import { generateLevel, placeSpecial, placeTunnel } from '../src/core/generator';
import { DICTIONARIES, translate } from '../src/core/i18n';
import {
  LevelError, buildLanes, checkLocks, checkReachable, levelLanes, parseImage, parseLevel, parseTunnels, walledIn, type LevelDef,
} from '../src/core/level';
import { VIEW, beltPoint, computeLayout, contains } from '../src/core/layout';
import { tipOnLevelStart, tipsPresent } from '../src/core/onboarding';
import { createRng } from '../src/core/rng';
import { boardDone, createBoard, findTarget } from '../src/core/rules';
import { createGame, launchFromColumn, launchFromSlot, step } from '../src/core/sim';
import { levelWinRate, runLoop, solve } from '../src/core/solver';
import { MOUTH_DEPTH, ROOF_INSET, laneSide, overlaps, roofTies, tunnelRoof } from '../src/core/tunnel';
import levels from '../src/levels/levels.json';
import { level } from './helpers';

const insideAny = (rects: readonly { x: number; y: number; w: number; h: number }[], p: { x: number; y: number }) => rects.some((r) => contains(r, p));

describe('tunnel: the lanes', () => {
  it('buildLanes without tunnels is what it always was, with them the blind lanes are empty and the rest untouched', () => {
    const plain = buildLanes(3, 2);
    expect(buildLanes(3, 2, [])).toEqual(plain);
    const blind = buildLanes(3, 2, [2, 3, 4]);
    expect(blind).toHaveLength(plain.length); // the belt keeps its length: a bucket still takes the same time to go round
    blind.forEach((lane, i) => expect(lane).toEqual([2, 3, 4].includes(i) ? [] : plain[i]));
  });

  it('levelLanes is buildLanes with the level\'s own tunnels, and the game plays on them', () => {
    const l = level(['RR', 'RR'], [[[RED, 4]]], { tunnels: [0, 1] });
    expect(levelLanes(l)).toEqual(buildLanes(2, 2, [0, 1]));
    expect(createGame(l).lanes).toEqual(buildLanes(2, 2, [0, 1]));
    expect(levelLanes(level(['RR', 'RR'], [[[RED, 4]]]))).toEqual(buildLanes(2, 2));
  });

  it('a shot along an empty lane hits nothing', () => {
    const l = level(['R'], [[[RED, 1]]]);
    expect(findTarget(l, createBoard(l), [], RED)).toBe(-1);
  });
});

describe('tunnel: parseTunnels', () => {
  const ok = (t: number[] | undefined, w = 3, h = 2) => parseTunnels(t, w, h);

  it('no tunnels is an empty list', () => {
    expect(ok(undefined)).toEqual([]);
    expect(ok([])).toEqual([]);
  });

  it('accepts one lane, a run, and a run at either end of the belt, and returns it sorted', () => {
    expect(ok([4])).toEqual([4]);
    expect(ok([1, 2, 3])).toEqual([1, 2, 3]);
    expect(ok([0, 1])).toEqual([0, 1]); // the first lane
    expect(ok([8, 9])).toEqual([8, 9]); // the last lanes (belt of 10)
    expect(ok([3, 1, 2])).toEqual([1, 2, 3]);
  });

  it('refuses a lane that is not on the belt, not a whole number, or listed twice', () => {
    expect(() => ok([10])).toThrow('not a lane of the belt (0 to 9)');
    expect(() => ok([-1, 0])).toThrow(LevelError);
    expect(() => ok([1.5])).toThrow(LevelError);
    expect(() => ok([NaN])).toThrow(LevelError);
    expect(() => ok([2, 2])).toThrow('listed twice');
  });

  it('refuses lanes that are not one stretch of the belt, wrap-around included', () => {
    expect(() => ok([1, 3])).toThrow('must be contiguous: 1 is followed by 3');
    expect(() => ok([0, 9])).toThrow('contiguous'); // the belt is a loop, but a tunnel does not cross the entry corner
  });

  it('refuses a tunnel over the whole belt: nothing would shoot', () => {
    expect(() => ok(Array.from({ length: 10 }, (_, i) => i))).toThrow('whole belt');
    expect(ok(Array.from({ length: 9 }, (_, i) => i))).toHaveLength(9); // one lane left is enough for the format
    expect(() => parseTunnels('x' as unknown as number[], 3, 2)).toThrow('list of lane indices');
  });
});

describe('tunnel: parseLevel', () => {
  const def = (extra: Partial<LevelDef>): LevelDef => ({
    id: 1, name: 'test', stage: 1, image: ['RR'], columns: [[{ color: RED, ammo: 2 }]], slots: 3, beltCapacity: 3, ...extra,
  });

  it('a level without tunnels has an empty list, with them the sorted lanes', () => {
    expect(parseLevel(def({})).tunnels).toEqual([]);
    expect(parseLevel(def({ tunnels: [3, 2] })).tunnels).toEqual([2, 3]);
  });

  it('a tunnel at the start, at the end or over all but one lane of the belt is fine while every pixel keeps a lane', () => {
    expect(parseLevel(def({ tunnels: [0] })).tunnels).toEqual([0]);
    expect(parseLevel(def({ tunnels: [5] })).tunnels).toEqual([5]);
    // 2×1: lane 0 reaches only the pixel on the left, so with [1..5] blind the pixel on the right is out of reach.
    expect(() => parseLevel(def({ tunnels: [1, 2, 3, 4, 5] }))).toThrow('pixel (1, 0) is walled in: every lane to it is in a tunnel');
    expect(() => parseLevel(def({ tunnels: [0, 1, 2, 3, 4, 5] }))).toThrow('whole belt');
  });

  it('a one-pixel level cannot hide it: the tunnel may cover at most three of its four lanes', () => {
    const one = (tunnels: number[]) => parseLevel(def({ image: ['R'], columns: [[{ color: RED, ammo: 1 }]], tunnels }));
    expect(one([0, 1, 2]).tunnels).toEqual([0, 1, 2]);
    expect(() => one([0, 1, 2, 3])).toThrow('whole belt');
  });

  it('names the first pixel no open lane reaches, counting stones and tunnels together', () => {
    // 3×1 with a stone between the pixels: each one is reached from its own side only.
    const image = ['R.R'];
    const w = (tunnels: number[]) => parseLevel(def({ image, overlay: ['.s.'], columns: [[{ color: RED, ammo: 2 }]], tunnels }));
    expect(w([]).tunnels).toEqual([]);
    expect(walledIn(3, 1, parseImage(image).targets, [false, true, false], [])).toBe(-1);
    // Pixel 2 is reached by its bottom lane (2), the right lane (3, before the stone) and its top lane (4): all three blind.
    expect(() => w([2, 3, 4])).toThrow('pixel (2, 0) is walled in: every lane to it is in a tunnel or blocked by a stone');
  });

  it('checkReachable explains a stone-only wall as before, and a tunnel one differently', () => {
    const { targets } = parseImage(['R.R']);
    expect(() => checkReachable(3, 1, targets, [false, true, false], [2, 3, 4])).toThrow('in a tunnel or blocked by a stone');
    expect(() => checkReachable(3, 1, targets, [false, false, false])).not.toThrow();
  });

  it('refuses a tunnel that shuts the only way to a key, and accepts the same level without it', () => {
    const lockedLevel = (tunnels?: number[]) => parseLevel(def({
      image: ['RRR'], overlay: ['l.k'], columns: [[{ color: RED, ammo: 3 }]], ...(tunnels ? { tunnels } : {}),
    }));
    expect(lockedLevel().tunnels).toEqual([]);
    expect(() => lockedLevel([2, 3, 4])).toThrow('key (2, 0) is walled in by locks');
    expect(() => checkLocks(3, 1, [true, false, false], [false, false, true], [false, false, false], [2, 3, 4])).toThrow('walled in by locks');
    expect(() => checkLocks(3, 1, [true, false, false], [false, false, true], [false, false, false])).not.toThrow();
  });

  it('keeps the ammo rule: a tunnel changes where paint lands, not how much of it a level needs', () => {
    expect(() => parseLevel(def({ tunnels: [0], columns: [[{ color: RED, ammo: 3 }]] }))).toThrow('ammo for color 1 is 3');
  });
});

/** Three pixels in a column, the blue one at the bottom; red buckets only reach the two red ones through the bottom lane. */
const column = (tunnels?: number[], columns: [typeof RED | typeof BLUE, number][][] = [[[RED, 1], [RED, 1], [BLUE, 1]]], slots = 1) =>
  level(['R', 'R', 'B'], columns, { slots, beltCapacity: 1, ...(tunnels ? { tunnels } : {}) });

describe('tunnel: simulation, solver and win rate agree', () => {
  it('a bucket never shoots from a blind lane: no hit event happens on one', () => {
    const l = level(['RR', 'RR'], [[[RED, 4]]], { tunnels: [0, 1, 2], slots: 3 });
    const g = createGame(l);
    launchFromColumn(g, 0);
    const lanesHit: number[] = [];
    while (g.belt.length + g.pending.length > 0 && g.status === 'playing') {
      step(g);
      lanesHit.push(...g.events.map((e) => e.lane));
    }
    expect(lanesHit.length).toBeGreaterThan(0);
    for (const lane of lanesHit) expect([0, 1, 2]).not.toContain(lane);
    expect(g.status).toBe('won');
  });

  it('a pixel is painted from another side when its own lane is blind: the same level still plays to the win', () => {
    const open = level(['R'], [[[RED, 1]]]);
    const blind = level(['R'], [[[RED, 1]]], { tunnels: [0, 1, 2] });
    for (const l of [open, blind]) {
      const g = createGame(l);
      launchFromColumn(g, 0);
      while (g.status === 'playing') step(g);
      expect(g.status).toBe('won');
    }
    // Only the left lane (3) is open: the shot lands there, a lap later than from the bottom lane.
    const first = (l: typeof open) => {
      const g = createGame(l);
      launchFromColumn(g, 0);
      for (let n = 0; n < 40 && g.status === 'playing'; n++) {
        step(g);
        if (g.events.length) return g.events[0]!.lane;
      }
      return -1;
    };
    expect(first(open)).toBe(0);
    expect(first(blind)).toBe(3);
  });

  it('runLoop on the level\'s lanes equals a lone bucket on the belt, tunnels included', () => {
    const l = parseLevel(debut as LevelDef);
    const lanes = levelLanes(l);
    expect(lanes.filter((lane) => lane.length === 0)).toHaveLength(6);
    const rng = createRng(11);
    for (let trial = 0; trial < 40; trial++) {
      const board = createBoard(l);
      const g = createGame(l);
      for (let k = 0; k < 4; k++) {
        const color = ([1, 2, 4] as const)[Math.floor(rng() * 3)]!;
        const ammo = 1 + Math.floor(rng() * 3);
        const left = runLoop(l, lanes, board, color, ammo);
        if (boardDone(l, board)) break;
        g.pending.push({ id: 100 + k, color, ammo, pos: 0, traveled: 0 });
        while (g.belt.length + g.pending.length > 0 && g.status === 'playing') step(g);
        expect(g.slots.find((s) => s?.id === 100 + k)?.ammo ?? 0).toBe(left);
        g.slots = g.slots.map(() => null);
        expect({ paint: g.paint, film: g.film, ice: g.ice }).toEqual({ paint: board.paint, film: board.film, ice: board.ice });
      }
    }
  });

  it('the solver finds a win on a level with a tunnel: blue first, so the red pixels behind it open', () => {
    const l = column([1, 2, 3, 4, 5, 6, 7], [[[BLUE, 1]], [[RED, 1]], [[RED, 1]]], 3);
    const result = solve(l);
    expect(result.solvable).toBe(true);
    expect(result.moves[0]).toEqual({ from: 'column', index: 0 }); // the blue bucket
    const g = createGame(l);
    for (const m of result.moves) {
      if (m.from === 'column') launchFromColumn(g, m.index);
      else launchFromSlot(g, m.index);
      do step(g); while ((g.belt.length || g.pending.length) && g.status === 'playing');
    }
    expect(g.status).toBe('won');
  });

  it('the solver proves a level unsolvable that the same level without a tunnel wins', () => {
    // Column [R, R, B]: with the tunnel the red pixels are open only behind the blue one, and one slot cannot park both reds.
    expect(solve(column()).solvable).toBe(true);
    const blind = column([1, 2, 3, 4, 5, 6, 7]);
    expect(solve(blind).solvable).toBe(false);
    expect(levelWinRate(blind)).toBe(0);
    expect(levelWinRate(column())).toBeGreaterThan(0);
  });

  it('levelWinRate is deterministic and a probability with a tunnel, and a blind belt costs the random tapper something', () => {
    const l = parseLevel(debut as LevelDef);
    const a = levelWinRate(l);
    expect(a).toBe(levelWinRate(l));
    expect(a).toBeGreaterThan(0);
    expect(a).toBeLessThanOrEqual(1);
    const harder = column([1, 2, 3, 4, 5, 6, 7], [[[BLUE, 1]], [[RED, 1]], [[RED, 1]]], 3);
    const easier = column(undefined, [[[BLUE, 1]], [[RED, 1]], [[RED, 1]]], 3);
    expect(levelWinRate(harder)).toBeLessThanOrEqual(levelWinRate(easier));
  });
});

describe('tunnel: the generator', () => {
  const image = ['.RR..RR.', 'RRRRRRRR', 'RRRYYRRR', '.RRRRRR.', '..RRRR..', '...BB...', '...BB...', '..BBBB..'];
  const fresh = (length: number, seed: number, overlay?: string[]) => placeTunnel(image, overlay, length, createRng(seed));

  it('is deterministic: the same seed gives the same lanes', () => {
    for (const seed of [1, 2, 3]) expect(fresh(6, seed)).toEqual(fresh(6, seed));
  });

  it('places one contiguous stretch of exactly the length asked, on the belt, that parseTunnels accepts', () => {
    for (let seed = 1; seed <= 40; seed++) {
      for (const length of [1, 4, 8, 20]) {
        const lanes = fresh(length, seed);
        expect(lanes).toHaveLength(length);
        expect(parseTunnels(lanes, 8, 8)).toEqual(lanes);
        expect(lanes[0]).toBeGreaterThanOrEqual(0);
        expect(lanes.at(-1)).toBeLessThan(32);
      }
    }
  });

  it('varies with the seed', () => {
    const starts = new Set(Array.from({ length: 30 }, (_, seed) => fresh(6, seed + 1)[0]));
    expect(starts.size).toBeGreaterThan(5);
  });

  it('leaves every pixel a lane and every key an open one, stones and locks included', () => {
    const overlay = placeSpecial(image, { key: 1, lock: 1, stone: 2 }, createRng(9));
    const { width, targets } = parseImage(image);
    for (let seed = 1; seed <= 25; seed++) {
      const lanes = placeTunnel(image, overlay, 10, createRng(seed));
      const l = parseLevel({
        ...generateLevel({ ...TUNNEL_DEBUT, special: undefined, overlay, attempts: 1, winRate: undefined }).def,
        tunnels: lanes,
      });
      expect(l.tunnels).toEqual(lanes);
      expect(walledIn(width, 8, targets, l.stone, lanes)).toBe(-1);
    }
  });

  it('skips a stretch that would shut the only way to a key', () => {
    // 3×1 with a lock on the left pixel and the key on the right one: only lanes 2, 3 and 4 reach the key.
    for (let seed = 1; seed <= 40; seed++) {
      const lanes = placeTunnel(['RRR'], ['l.k'], 3, createRng(seed));
      expect(lanes).not.toEqual([2, 3, 4]);
      expect(lanes).toHaveLength(3);
    }
  });

  it('refuses a length that is not a positive whole number, or that covers the whole belt', () => {
    expect(() => fresh(0, 1)).toThrow('positive number of lanes');
    expect(() => fresh(1.5, 1)).toThrow('positive number of lanes');
    expect(() => fresh(32, 1)).toThrow('whole belt');
    // 3×1 with a stone between the pixels: every stretch of seven lanes leaves one pixel without a way in.
    expect(() => placeTunnel(['R.R'], ['.s.'], 7, createRng(1))).toThrow('no stretch of 7 lanes can be a tunnel');
  });

  it('does not move anything else: a level without a tunnel is exactly the level it was', () => {
    const base = { ...TUNNEL_DEBUT, special: undefined, winRate: undefined };
    const plain = generateLevel(base);
    expect(plain.def).not.toHaveProperty('tunnels');
    const withTunnel = generateLevel({ ...base, special: { tunnel: 6 } });
    expect(withTunnel.def.tunnels).toHaveLength(6);
    expect(withTunnel.def.image).toEqual(plain.def.image);
    // Tunnel with other mechanics: the overlay is the one the same special gives without the tunnel.
    const a = generateLevel({ ...base, special: { ice: 2, tunnel: 4 } });
    const b = generateLevel({ ...base, special: { ice: 2 } });
    expect(a.def.overlay).toEqual(b.def.overlay);
  });

  it('generates the debut level deterministically: a tunnel over six lanes, very easy and solvable', () => {
    const a = generateLevel(TUNNEL_DEBUT);
    expect(a).toEqual(generateLevel(TUNNEL_DEBUT));
    expect(a.def).toEqual(debut);
    const l = parseLevel(a.def);
    expect(l.tunnels).toHaveLength(6);
    expect(a.winRate).toBeGreaterThanOrEqual(0.9);
    expect(solve(l).solvable).toBe(true);
    // The tunnel turns a corner, so the debut shows the roof bending too.
    expect(new Set(l.tunnels.map((lane) => laneSide(lane, l.width, l.height))).size).toBeGreaterThan(1);
  });

  it('no level before 341 has a tunnel, and 341 is the first that does (stage 35, #240)', () => {
    const withTunnel = (levels as LevelDef[]).filter((def) => 'tunnels' in def);
    expect(withTunnel.length).toBeGreaterThan(0);
    expect(withTunnel[0]!.id).toBe(341);
  });
});

describe('tunnel: onboarding and texts', () => {
  const debutLevel = parseLevel(debut as LevelDef);

  it('is a mechanic of the level the first time it is on the board', () => {
    expect(tipsPresent(debutLevel)).toContain('tunnel');
    expect(tipsPresent(level(['R'], [[[RED, 1]]]))).not.toContain('tunnel');
  });

  it('shows the card once at the debut, after the ones the player has not seen yet, and never again', () => {
    const seen = ['guide', 'mixing', 'blocked', 'slots', 'ice', 'film', 'hidden', 'belt', 'queue', 'leftover'];
    expect(tipOnLevelStart(debutLevel, seen)).toBe('tunnel');
    expect(tipOnLevelStart(debutLevel, [...seen, 'tunnel'])).toBeNull();
  });

  it('counts as a feature of the level for the difficulty curve', () => {
    expect(curveLevel(debutLevel, 1).features).toContain('tunnel');
    expect(curveLevel(level(['R'], [[[RED, 1]]]), 1).features).not.toContain('tunnel');
  });

  it('has a card in both languages, written, distinct and short enough for the card', () => {
    for (const lang of ['en', 'it'] as const) {
      const dict = DICTIONARIES[lang] as Record<string, string>;
      expect(dict['tip.tunnel.title']!.trim().length).toBeGreaterThan(0);
      expect(dict['tip.tunnel.body']!.trim().length).toBeGreaterThan(0);
      expect(dict['tip.tunnel.body']!.split('\n').every((line) => line.length <= 40)).toBe(true);
    }
    expect(translate('en', 'tip.tunnel.title')).not.toBe(translate('it', 'tip.tunnel.title'));
    expect(translate('it', 'tip.tunnel.body')).toContain('galleria');
    expect(translate('en', 'tip.tunnel.body')).toContain('tunnel');
  });
});

describe('tunnel: geometry of the roof', () => {
  // The two phones of the e2e: 360×640 is 720×1280 logical, 412×915 is 720×1599.
  const screens = [VIEW.height, Math.round((720 * 915) / 412)];
  const sizes: [number, number][] = [[8, 8], [16, 16], [5, 12], [12, 5], [1, 1], [2, 1]];

  it('tells the side of each lane in belt order', () => {
    expect([0, 2, 3, 4, 5, 6, 7, 9].map((lane) => laneSide(lane, 3, 2))).toEqual(['bottom', 'bottom', 'right', 'right', 'top', 'top', 'top', 'left']);
    expect(() => laneSide(10, 3, 2)).toThrow('not on the belt');
    expect(() => laneSide(-1, 3, 2)).toThrow('not on the belt');
  });

  it('is empty without tunnels', () => {
    const layout = computeLayout(4, 4, 3, 3);
    expect(tunnelRoof(layout, 4, 4, [])).toEqual({ pieces: [], mouths: [] });
  });

  it('covers every blind lane\'s spot on the belt and no open lane\'s, so a bucket vanishes at the mouth and shows at the other', () => {
    for (const screen of screens) {
      for (const [w, h] of sizes) {
        const layout = computeLayout(w, h, 3, 3, screen);
        const count = 2 * (w + h);
        for (const [from, to] of [[0, 0], [0, Math.min(5, count - 2)], [Math.floor(count / 2), Math.min(count - 1, Math.floor(count / 2) + 3)], [Math.max(0, count - 3), count - 1]] as const) {
          if (to - from + 1 >= count) continue;
          const tunnels = Array.from({ length: to - from + 1 }, (_, i) => from + i);
          const roof = tunnelRoof(layout, w, h, tunnels);
          for (let lane = 0; lane < count; lane++) {
            expect(insideAny(roof.pieces, layout.lanes[lane]!), `lane ${lane} of ${w}×${h}`).toBe(tunnels.includes(lane));
          }
          // A bucket between two open lanes is in the open.
          if (tunnels[0]! > 1) expect(insideAny(roof.pieces, beltPoint(layout, tunnels[0]! - 1.5))).toBe(false);
        }
      }
    }
  });

  it('stays inside the belt ring and never covers the canvas, the waiting slots or the columns', () => {
    for (const screen of screens) {
      for (const [w, h] of sizes) {
        const layout = computeLayout(w, h, 4, 3, screen);
        const count = 2 * (w + h);
        // A long tunnel that turns every corner but one, the worst case for coverage.
        const tunnels = Array.from({ length: count - 1 }, (_, i) => i);
        const roof = tunnelRoof(layout, w, h, tunnels);
        for (const piece of [...roof.pieces, ...roof.mouths]) {
          expect(piece.x).toBeGreaterThanOrEqual(layout.belt.x - 1e-9);
          expect(piece.y).toBeGreaterThanOrEqual(layout.belt.y - 1e-9);
          expect(piece.x + piece.w).toBeLessThanOrEqual(layout.belt.x + layout.belt.w + 1e-9);
          expect(piece.y + piece.h).toBeLessThanOrEqual(layout.belt.y + layout.belt.h + 1e-9);
          expect(overlaps(piece, layout.canvas)).toBe(false);
          for (const other of [...layout.slots, ...layout.columns]) expect(overlaps(piece, other)).toBe(false);
        }
      }
    }
  });

  it('is as thick as the belt less a margin each side, and a mouth spans the whole belt across and its depth along', () => {
    const layout = computeLayout(8, 8, 3, 3);
    const roof = tunnelRoof(layout, 8, 8, [1, 2]); // two bottom lanes
    expect(roof.pieces).toHaveLength(1);
    expect(roof.pieces[0]!.h).toBeCloseTo(layout.beltThickness - 2 * ROOF_INSET, 6);
    expect(roof.pieces[0]!.w).toBeCloseTo(2 * layout.cell, 6);
    expect(roof.mouths).toHaveLength(2);
    for (const m of roof.mouths) {
      expect(m.w).toBe(MOUTH_DEPTH);
      expect(m.h).toBe(layout.beltThickness);
    }
    // The mouths sit at the two ends of the roof, on its edges.
    expect(roof.mouths[0]!.x + MOUTH_DEPTH / 2).toBeCloseTo(roof.pieces[0]!.x, 6);
    expect(roof.mouths[1]!.x + MOUTH_DEPTH / 2).toBeCloseTo(roof.pieces[0]!.x + roof.pieces[0]!.w, 6);
  });

  it('on a vertical side the roof and its mouths turn the other way', () => {
    const layout = computeLayout(8, 8, 3, 3);
    const roof = tunnelRoof(layout, 8, 8, [9, 10, 11]); // three right-side lanes
    expect(roof.pieces).toHaveLength(1);
    expect(roof.pieces[0]!.w).toBeCloseTo(layout.beltThickness - 2 * ROOF_INSET, 6);
    expect(roof.pieces[0]!.h).toBeCloseTo(3 * layout.cell, 6);
    for (const m of roof.mouths) {
      expect(m.h).toBe(MOUTH_DEPTH);
      expect(m.w).toBe(layout.beltThickness);
    }
    // Right side runs bottom → top: the first mouth is at the bottom of the roof.
    expect(roof.mouths[0]!.y).toBeGreaterThan(roof.mouths[1]!.y);
  });

  it('a tunnel that turns a corner is one connected roof: the pieces overlap where it bends', () => {
    const layout = computeLayout(8, 8, 3, 3);
    const roof = tunnelRoof(layout, 8, 8, [6, 7, 8, 9]); // two bottom lanes, two right-side lanes: the bottom-right corner
    expect(roof.pieces).toHaveLength(2);
    expect(overlaps(roof.pieces[0]!, roof.pieces[1]!)).toBe(true);
    // The corner square of the belt is covered.
    const corner = { x: layout.canvas.x + layout.canvas.w + layout.beltThickness / 2, y: layout.canvas.y + layout.canvas.h + layout.beltThickness / 2 };
    expect(insideAny(roof.pieces, corner)).toBe(true);
    // And a tunnel that stops short of the corner leaves it open.
    const short = tunnelRoof(layout, 8, 8, [6, 7]);
    expect(insideAny(short.pieces, corner)).toBe(false);
  });

  it('draws a tie across every blind lane, inside the roof', () => {
    const layout = computeLayout(8, 8, 3, 3);
    const tunnels = [5, 6, 7, 8, 9];
    const roof = tunnelRoof(layout, 8, 8, tunnels);
    const ties = roofTies(layout, 8, 8, tunnels);
    expect(ties).toHaveLength(tunnels.length);
    for (const [x1, y1, x2, y2] of ties) {
      expect(insideAny(roof.pieces, { x: x1, y: y1 })).toBe(true);
      expect(insideAny(roof.pieces, { x: x2, y: y2 })).toBe(true);
    }
  });
});
