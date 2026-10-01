/**
 * Esperimento (ticket belt-capacity): vittorie di un giocatore casuale "eager" con la simulazione reale
 * al variare di beltCapacity. Confronta con randomWinRate (solver), che modella un solo secchiello sul nastro.
 *   npx tsx scripts/belt-capacity-experiment.ts
 */
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type LevelDef } from '../src/core/level';
import { createRng } from '../src/core/rng';
import { createGame, launchFromColumn, launchFromSlot, step, type GameState } from '../src/core/sim';
import { randomWinRate } from '../src/core/solver';

const CAPS = [1, 2, 3, 4, 6, 99];
const PLAYOUTS = 150;

type Outcome = 'won' | 'jammed' | 'stuck';

/** Eager random player: whenever the belt has room, launch a random available shooter; otherwise advance time. */
function play(def: LevelDef, cap: number, rng: () => number): Outcome {
  const level = parseLevel({ ...def, beltCapacity: cap });
  const g: GameState = createGame(level, { boardGap: 1 });
  for (let t = 0; t < 40_000; t++) {
    if (g.status === 'won') return 'won';
    if (g.status === 'jammed') return 'jammed';
    const opts: (() => boolean)[] = [];
    g.queues.forEach((q, c) => q.length && opts.push(() => launchFromColumn(g, c)));
    g.slots.forEach((s, i) => s && opts.push(() => launchFromSlot(g, i)));
    if (opts.length === 0 && g.belt.length + g.pending.length === 0) return 'stuck';
    if (opts.length) opts[Math.floor(rng() * opts.length)]!();
    step(g);
  }
  return 'stuck';
}

const defs = levelsJson as LevelDef[];
const byStage: Record<number, Record<string, { won: number; jam: number; n: number }>> = {};
const total: Record<string, { won: number; jam: number; n: number }> = {};
const seqRows: number[] = [];
for (const def of defs) {
  const stage = Math.ceil(def.id / 10);
  seqRows.push(randomWinRate(parseLevel(def), 150, createRng(def.id)));
  for (const cap of CAPS) {
    const rng = createRng(def.id * 31 + cap);
    let won = 0, jam = 0;
    for (let p = 0; p < PLAYOUTS; p++) {
      const o = play(def, cap, rng);
      if (o === 'won') won++;
      else if (o === 'jammed') jam++;
    }
    for (const bucket of [(byStage[stage] ??= {}), total]) {
      const b = (bucket[cap] ??= { won: 0, jam: 0, n: 0 });
      b.won += won; b.jam += jam; b.n += PLAYOUTS;
    }
  }
}
const pct = (b: { won: number; n: number }) => (100 * b.won / b.n).toFixed(1).padStart(5);
console.log('stage | ' + CAPS.map((c) => `cap${c}`.padStart(6)).join(' '));
for (const [s, r] of Object.entries(byStage)) console.log(s.padStart(5) + ' | ' + CAPS.map((c) => pct(r[c]!)).join(' '));
console.log('TOTAL | ' + CAPS.map((c) => pct(total[c]!)).join(' '));
console.log('jam%  | ' + CAPS.map((c) => (100 * total[c]!.jam / total[c]!.n).toFixed(1).padStart(5)).join(' '));
console.log('sequential random baseline (solver.randomWinRate): ' + (100 * seqRows.reduce((a, b) => a + b, 0) / seqRows.length).toFixed(1));
