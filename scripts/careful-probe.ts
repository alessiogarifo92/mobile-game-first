/**
 * Margin probe for shipped levels (#162): for each id, the random tapper (levelWinRate), the careful player
 * (levelCarefulWinRate: paints the most at every step, never jams while it can avoid it, never takes "+1 slot") and
 * whether the solver still finds a solution with one slot fewer (a level solvable that way leaves a slot of margin).
 *   npx tsx scripts/careful-probe.ts 179 184 200
 *   npx tsx scripts/careful-probe.ts 191-200
 */
import { readFileSync } from 'node:fs';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelCarefulWinRate, levelWinRate, solve } from '../src/core/solver';

const defs: LevelDef[] = JSON.parse(readFileSync(new URL('../src/levels/levels.json', import.meta.url), 'utf8'));
const ids = process.argv.slice(2).flatMap((arg) => {
  const [from, to] = arg.split('-').map(Number);
  return to ? Array.from({ length: to - from! + 1 }, (_, i) => from! + i) : [from!];
});
if (ids.length === 0) {
  console.error('usage: npx tsx scripts/careful-probe.ts <id|from-to>...');
  process.exit(1);
}
console.log('level  slots  random  careful  solvable with one slot fewer');
for (const id of ids) {
  const def = defs.find((d) => d.id === id);
  if (!def) throw new Error(`no level ${id}`);
  const level = parseLevel(def);
  const fewer = level.slots > 1 ? solve({ ...level, slots: level.slots - 1 }) : undefined;
  const margin = fewer ? (fewer.solvable ? 'yes' : fewer.exhaustive ? 'no' : 'no (budget)') : '-';
  const pct = (r: number) => `${Math.round(r * 100)}%`.padStart(6);
  console.log(`${String(id).padStart(5)}  ${String(level.slots).padStart(5)}  ${pct(levelWinRate(level))}  ${pct(levelCarefulWinRate(level)).padStart(7)}  ${margin}`);
}
