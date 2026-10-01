/**
 * Generates src/levels/levels.json from the stage files (scripts/stages). Only levels whose spec hash
 * changed are regenerated; each one is kept only if the solver proves it solvable inside its difficulty band.
 *   npm run gen:levels            regenerate what changed
 *   npm run gen:levels -- --check exit 1 if levels.json is out of date (used by CI)
 *   npm run gen:levels -- --force regenerate everything
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { generateLevel } from '../src/core/generator';
import { LEVEL_NAME_KEYS } from '../src/core/i18n';
import type { LevelDef } from '../src/core/level';
import { assignIds, specHash, validateStages } from '../src/core/stages';
import { STAGE_SPECS } from './stages';

const out = new URL('../src/levels/levels.json', import.meta.url);
const check = process.argv.includes('--check');
const force = process.argv.includes('--force');

validateStages(STAGE_SPECS, LEVEL_NAME_KEYS);
const specs = assignIds(STAGE_SPECS);
const existing: LevelDef[] = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
const byId = new Map(existing.map((l) => [l.id, l]));

const stale = specs.filter((s) => force || byId.get(s.id)?.specHash !== specHash(s));
if (check) {
  if (stale.length > 0 || existing.length !== specs.length) {
    console.error(`levels.json is out of date (${stale.length} levels changed, ${existing.length} stored vs ${specs.length} specs). Run npm run gen:levels.`);
    process.exit(1);
  }
  console.log(`levels.json up to date (${specs.length} levels)`);
  process.exit(0);
}

const levels = specs.map((spec) => {
  const hash = specHash(spec);
  const cached = byId.get(spec.id);
  if (!force && cached?.specHash === hash) return cached;
  const started = Date.now();
  const { def, seed, nodes, winRate } = generateLevel({ attempts: 400, ...spec });
  console.log(
    `#${def.id} s${def.stage}${def.boss ? ' BOSS' : ''} ${def.name.padEnd(11)} seed=${seed} shooters=${def.columns.flat().length} ` +
      `nodes=${nodes} randomWin=${winRate.toFixed(2)} ${Date.now() - started}ms`,
  );
  return { ...def, specHash: hash };
});

writeFileSync(out, JSON.stringify(levels, null, 1) + '\n');
console.log(`wrote ${levels.length} levels (${stale.length} regenerated)`);
