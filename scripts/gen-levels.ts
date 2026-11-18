/**
 * Generates src/levels/levels.json from the stage files (scripts/stages). Only levels whose spec hash
 * changed are regenerated; each one is kept only if the solver proves it solvable inside its difficulty band.
 * Also writes src/levels/difficulty.json (win rate and band of every level, #72: kept beside levels.json so stage PRs do not
 * conflict on it; the win rate is measured only for levels whose spec hash changed) and src/levels/stages.json (name key, colour and completeness of each stage) and src/levels/universes.json
 * (name key, colour and canvas of each universe, from scripts/universes.ts), for the map, the album and the selector.
 *   npm run gen:levels            regenerate what changed
 *   npm run gen:levels -- --check exit 1 if levels.json, stages.json or universes.json is out of date (used by CI)
 *   npm run gen:levels -- --force regenerate everything
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { checkCurve, curveLevel } from '../src/core/curve';
import { DIFFICULTY, bandChanges, buildDifficultyFile, checkDifficulty, storedProblems, type DifficultyFile, type DifficultyInput } from '../src/core/difficulty';
import { generateLevel } from '../src/core/generator';
import { LEVEL_NAME_KEYS, STAGE_NAME_KEYS, UNIVERSE_NAME_KEYS } from '../src/core/i18n';
import { parseLevel, type LevelDef } from '../src/core/level';
import { levelWinRate } from '../src/core/solver';
import { assignIds, specHash, stageInfos, validateStages } from '../src/core/stages';
import { validateUniverses } from '../src/core/universes';
import { UNIVERSE_SPECS } from './universes';
import { STAGE_SPECS } from './stages';
import { KNOWN_CURVE_ERRORS } from './stages/curve-known';

const out = new URL('../src/levels/levels.json', import.meta.url);
const difficultyOut = new URL('../src/levels/difficulty.json', import.meta.url);
const readDifficulty = (): DifficultyFile | undefined => (existsSync(difficultyOut) ? JSON.parse(readFileSync(difficultyOut, 'utf8')) : undefined);
/** Small generated files rewritten as a whole: what the game knows about stages and universes. */
const metaFiles = [
  { name: 'stages.json', url: new URL('../src/levels/stages.json', import.meta.url), text: () => JSON.stringify(stageInfos(STAGE_SPECS), null, 1) + '\n' },
  { name: 'universes.json', url: new URL('../src/levels/universes.json', import.meta.url), text: () => JSON.stringify(UNIVERSE_SPECS, null, 1) + '\n' },
];
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

validateStages(STAGE_SPECS, LEVEL_NAME_KEYS, STAGE_NAME_KEYS);
validateUniverses(UNIVERSE_SPECS, STAGE_SPECS, UNIVERSE_NAME_KEYS);
const specs = assignIds(STAGE_SPECS);
/** Level + stored win rate + the spec's notes, as the difficulty CI check wants them (#72). */
const difficultyInputs = (defs: readonly LevelDef[], file: DifficultyFile): DifficultyInput[] => {
  const rates = new Map(file.levels.map((l) => [l.id, l.winRate]));
  return defs.map((def, i) => ({
    id: def.id, stage: def.stage, boss: !!def.boss, winRate: rates.get(def.id)!, beltCapacity: def.beltCapacity, slots: def.slots,
    ...(specs[i]!.winRate ? { specBand: specs[i]!.winRate } : {}),
    ...(specs[i]!.curve?.difficulty ? { declared: specs[i]!.curve!.difficulty } : {}),
  }));
};
/** Prints the CI notes over the labels; returns the number of errors. */
const reportDifficulty = (defs: readonly LevelDef[], file: DifficultyFile): number => {
  const notes = checkDifficulty(difficultyInputs(defs, file));
  const errors = notes.filter((n) => n.severity === 'error');
  const info = notes.filter((n) => n.severity === 'info');
  console.log(`\ndifficulty (table v${DIFFICULTY.version}): ${errors.length} errors, ${info.length} notes (informative)`);
  // One line per kind (`checkDifficulty` has the full message of each): the list would drown the CI log.
  for (const kind of ['near', 'spec-crossing', 'generous'] as const) {
    const ofKind = info.filter((n) => n.kind === kind);
    if (ofKind.length === 0) continue;
    const label = { near: 'within 3 points of a threshold', 'spec-crossing': 'spec band crosses a threshold (narrow it or declare curve.difficulty)', generous: 'boss with more belt or slots than the stage' }[kind];
    console.log(`  note ${label} (${ofKind.length}): ${ofKind.map((n) => n.key).join(' ')}`);
    if (kind === 'generous') for (const n of ofKind) console.log(`    ${n.message}`);
  }
  for (const n of errors) console.error(`  error ${n.kind} ${n.key}: ${n.message}`);
  return errors.length;
};
const bandTable = (changes: { id: number; winRate: number; from: string; to: string }[]) =>
  changes.map((c) => `  #${c.id}: ${c.from} -> ${c.to} (${Math.round(c.winRate * 100)}%)`).join('\n');
const staleMeta = metaFiles.filter((f) => !existsSync(f.url) || readFileSync(f.url, 'utf8') !== f.text());
const existing: LevelDef[] = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : [];
const byId = new Map(existing.map((l) => [l.id, l]));

const stale = specs.filter((s) => force || byId.get(s.id)?.specHash !== hashOf(s));
if (check) {
  if (stale.length > 0 || existing.length !== specs.length) {
    console.error(`levels.json is out of date (${stale.length} levels changed, ${existing.length} stored vs ${specs.length} specs). Run npm run gen:levels.`);
    process.exit(1);
  }
  if (staleMeta.length > 0) {
    console.error(`${staleMeta.map((f) => f.name).join(', ')} out of date. Run npm run gen:levels.`);
    process.exit(1);
  }
  const storedFile = readDifficulty();
  const problems = storedProblems(storedFile, existing.map((l) => ({ id: l.id, specHash: l.specHash! })));
  if (problems.length > 0) {
    const moved = storedFile ? bandChanges(storedFile) : [];
    console.error(`difficulty.json is out of date:\n${problems.map((p) => `  ${p}`).join('\n')}\nRun npm run gen:levels.` +
      (moved.length ? `\nlevels that change band:\n${bandTable(moved)}` : ''));
    process.exit(1);
  }
  console.log(`levels.json, difficulty.json, stages.json and universes.json up to date (${specs.length} levels, ${STAGE_SPECS.length} stages, ${UNIVERSE_SPECS.length} universes)`);
  process.exit(reportDifficulty(existing, storedFile!) > 0 ? 1 : 0);
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
for (const f of metaFiles) writeFileSync(f.url, f.text());

// Difficulty (#72): the win rate is measured only for levels whose spec hash changed; the bands are always recomputed from it.
const previous = readDifficulty();
const cachedRates = new Map((previous?.levels ?? []).map((l) => [l.id, l]));
const difficultyFile = buildDifficultyFile(levels.map((def) => {
  const hit = cachedRates.get(def!.id);
  const winRate = !force && hit && hit.specHash === def!.specHash ? hit.winRate : Number(levelWinRate(parseLevel(def!)).toFixed(3));
  return { id: def!.id, specHash: def!.specHash!, winRate };
}));
writeFileSync(difficultyOut, JSON.stringify(difficultyFile, null, 1) + '\n');
const moved = previous ? difficultyFile.levels.filter((l) => cachedRates.get(l.id) && cachedRates.get(l.id)!.band !== l.band) : [];
if (moved.length > 0) {
  console.log(`\nlevels that change band (table v${previous!.version} -> v${DIFFICULTY.version}, or a regenerated level):\n${bandTable(moved.map((l) => ({ id: l.id, winRate: l.winRate, from: cachedRates.get(l.id)!.band, to: l.band })))}`);
}
const difficultyErrors = reportDifficulty(levels as LevelDef[], difficultyFile);
console.log(`wrote ${levels.length} levels (${stale.length} regenerated) in ${STAGE_SPECS.length} stages`);

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
if (difficultyErrors > 0) process.exit(1);
if (errors.length > 0) {
  console.error(`\n${errors.length} curve errors (src/core/curve.ts):\n${errors.map((v) => `  ${v.key}: ${v.message}`).join('\n')}`);
  process.exit(1);
}
