/**
 * Aggregates the valid playtest forms of #69 into one JSON next to the report.
 *   npx tsx scripts/playtest/aggregate-cli.ts --out docs/reports/2026-10-31-playtest-agent.json docs/playtest/sessioni
 * Reads every `Tnn-Ann.json` under the given folders (drafts and `.invalid.json` are left out, protocol §6) and
 * adds the random-play win rate of each level seen (`levelWinRate`, the same curve as the difficulty reports).
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import levelsJson from '../../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type LevelDef } from '../../src/core/level';
import { levelWinRate } from '../../src/core/solver';
import { aggregate, coverageGaps, type Form } from './aggregate';

const { values: args, positionals } = parseArgs({ options: { out: { type: 'string' } }, allowPositionals: true });
if (!args.out || positionals.length === 0) throw new Error('usage: aggregate-cli.ts --out <file.json> <dir>...');

const files = positionals.flatMap((dir) => readdirSync(dir).filter((f) => /^T\d{2}-A\d{2}\.json$/.test(f)).map((f) => join(dir, f)));
const forms = files.map((f) => JSON.parse(readFileSync(f, 'utf8')) as Form);
const seen = new Set(forms.flatMap((f) => f.levels.map((l) => l.levelId)));
const randomWin: Record<number, number> = {};
for (const def of levelsJson as LevelDef[]) {
  if (seen.has(def.id)) randomWin[def.id] = Number(levelWinRate(parseLevel(def)).toFixed(3));
}
const agg = aggregate(forms, randomWin);
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const out = {
  generatedFrom: files.map((f) => f.split('/').pop()),
  builds: [...new Set(forms.map((f) => JSON.stringify((f as unknown as { build: unknown }).build)))].map((b) => JSON.parse(b)),
  coverageGaps: { 'U1-FINE+U2 (95-200, min 3)': coverageGaps(agg, range(95, 200), 3) },
  ...agg,
};
writeFileSync(args.out, JSON.stringify(out, null, 1) + '\n');
console.log(`${forms.length} forms, ${agg.levels.length} levels, ${agg.bugs.length} bugs -> ${args.out}`);
