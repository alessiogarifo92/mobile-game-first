/**
 * Generates src/levels/levels.json from the stage files (scripts/stages). Only levels whose spec hash
 * changed are regenerated; each one is kept only if the solver proves it solvable inside its difficulty band.
 *   npm run gen:levels            regenerate what changed
 *   npm run gen:levels -- --check exit 1 if levels.json is out of date (used by CI)
 *   npm run gen:levels -- --force regenerate everything
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { checkCurve, curveLevel } from '../src/core/curve';
import { generateLevel } from '../src/core/generator';
import { LEVEL_NAME_KEYS } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import { assignIds, specHash, validateStages } from '../src/core/stages';
import { STAGE_SPECS } from './stages';
import { KNOWN_CURVE_ERRORS } from './stages/curve-known';

const out = new URL('../src/levels/levels.json', import.meta.url);
/** Bump when the tuning policy below changes, so cached levels are regenerated. */
const POLICY_VERSION = 2;
/** Curve notes never change the generated level, so they stay out of the hash. */
const withoutCurve = <T extends { curve?: unknown }>(spec: T): Omit<T, 'curve'> => {
  const copy = { ...spec };
  delete copy.curve;
  return copy;
};
const hashOf = (spec: { curve?: unknown }) => specHash({ ...withoutCurve(spec), policy: POLICY_VERSION });
const check = process.argv.includes('--check');
const force = process.argv.includes('--force');

validateStages(STAGE_SPECS, LEVEL_NAME_KEYS);
const specs = assignIds(STAGE_SPECS);
const existing: LevelDef[] = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
const byId = new Map(existing.map((l) => [l.id, l]));

const stale = specs.filter((s) => force || byId.get(s.id)?.specHash !== hashOf(s));
if (check) {
  if (stale.length > 0 || existing.length !== specs.length) {
    console.error(`levels.json is out of date (${stale.length} levels changed, ${existing.length} stored vs ${specs.length} specs). Run npm run gen:levels.`);
    process.exit(1);
  }
  console.log(`levels.json up to date (${specs.length} levels)`);
  process.exit(0);
}

const failures: string[] = [];
const levels = specs.map((full) => {
  const spec = withoutCurve(full);
  const hash = hashOf(full);
  const cached = byId.get(spec.id);
  if (!force && cached?.specHash === hash) return cached;
  const started = Date.now();
  let generated;
  let tuned = '';
  // A level too easy for its band is tightened step by step: one slot fewer first, then fuller
  // buckets, never below the minimum number of shooters. If nothing fits, the band is relaxed:
  // a slightly easier level beats one with three giant buckets and no decisions.
  const chunk = spec.ammoChunk;
  const fewer = Math.max(2, spec.slots - 1);
  const smaller = Math.max(4, Math.floor(chunk * 0.7));
  const steps: Partial<typeof spec>[] = [
    {},
    { slots: fewer },
    { ammoChunk: smaller }, // small pictures: more, smaller buckets to reach the minimum
    { ammoChunk: smaller, slots: fewer },
    { ammoChunk: Math.ceil(chunk * 1.5) },
    { ammoChunk: Math.ceil(chunk * 1.5), slots: fewer },
    { ammoChunk: chunk * 2, slots: fewer },
    { winRate: undefined },
    { winRate: undefined, ammoChunk: smaller },
  ];
  let error = '';
  for (const step of steps) {
    try {
      generated = generateLevel({ attempts: 400, minShooters: spec.stage >= 3 ? 6 : undefined, ...spec, ...step });
      tuned = 'winRate' in step ? ' RELAXED (band not reachable)' : Object.keys(step).length ? ` tuned=${JSON.stringify(step)}` : '';
      break;
    } catch (e) {
      error = (e as Error).message;
    }
  }
  if (!generated) {
    // Keep going so one run reports every level that needs re-tuning.
    failures.push(`#${spec.id} ${spec.name} (band ${JSON.stringify(spec.winRate ?? null)}): ${error}`);
    return null;
  }
  const { def, seed, nodes, winRate } = generated;
  console.log(
    `#${def.id} s${def.stage}${def.boss ? ' BOSS' : ''} ${def.name.padEnd(11)} seed=${seed} shooters=${def.columns.flat().length} ` +
      `nodes=${nodes} randomWin=${winRate.toFixed(2)}${tuned} ${Date.now() - started}ms`,
  );
  return { ...def, specHash: hash };
});

if (failures.length > 0) {
  console.error(`\n${failures.length} levels could not be generated; levels.json left unchanged:\n${failures.join('\n')}`);
  process.exit(1);
}
writeFileSync(out, JSON.stringify(levels, null, 1) + '\n');
console.log(`wrote ${levels.length} levels (${stale.length} regenerated)`);

// Curve rules (#88) over the whole game: a new error fails the run (levels.json is kept, so a fix to the specs
// regenerates only what changed); known errors (#89) and warnings are listed.
const curve = checkCurve(levels.map((def, i) => {
  const level = parseLevel(def!);
  return curveLevel(level, levelWinRate(level), !!specs[i]!.curve?.easyBoss);
}));
const known = new Set(KNOWN_CURVE_ERRORS);
const errors = curve.filter((v) => v.severity === 'error' && !known.has(v.key));
const fixed = KNOWN_CURVE_ERRORS.filter((k) => !curve.some((v) => v.key === k));
const warnings = curve.filter((v) => v.severity === 'warning');
console.log(`\ncurve: ${errors.length} new errors, ${curve.length - errors.length - warnings.length} known (#89), ${warnings.length} warnings`);
for (const v of warnings) console.log(`  warning ${v.key}: ${v.message}`);
for (const k of fixed) console.log(`  fixed ${k}: remove it from scripts/stages/curve-known.ts`);
if (errors.length > 0) {
  console.error(`\n${errors.length} curve errors (src/core/curve.ts):\n${errors.map((v) => `  ${v.key}: ${v.message}`).join('\n')}`);
  process.exit(1);
}
