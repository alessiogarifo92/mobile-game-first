/** Generates src/levels/levels.json: deals shooters for each spec and keeps only solver-verified deals. */
import { writeFileSync } from 'node:fs';
import { generateLevel } from '../src/core/generator';
import { LEVEL_SPECS } from './level-specs';

const levels = LEVEL_SPECS.map((spec, i) => {
  const started = Date.now();
  const { def, seed, nodes, winRate } = generateLevel({ ...spec, id: i + 1, attempts: 400 });
  const shooters = def.columns.flat().length;
  console.log(`#${def.id} ${def.name.padEnd(12)} seed=${seed} shooters=${shooters} nodes=${nodes} randomWin=${winRate.toFixed(2)} ${Date.now() - started}ms`);
  return def;
});

writeFileSync(new URL('../src/levels/levels.json', import.meta.url), JSON.stringify(levels, null, 1) + '\n');
console.log(`wrote ${levels.length} levels`);
