/**
 * Release helpers of the *Android APK* workflow (`.github/workflows/android.yml`), run from the repo root.
 *   npx tsx scripts/release/cli.ts check 0.6.1   # the checks of a release run; exits 1 with one ::error:: per failure
 *   npx tsx scripts/release/cli.ts notes 0.6.1   # the CHANGELOG.md section of that version (empty when missing)
 * `check` reads PRERELEASE, GITHUB_REF, GITHUB_SHA, GITHUB_REPOSITORY and GH_TOKEN (for `gh api`) from the run.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { changelogSection, releaseErrors, versionError, type CiRun } from './checks';

const [command, version] = process.argv.slice(2);
if ((command !== 'check' && command !== 'notes') || version === undefined) throw new Error('usage: cli.ts check|notes <X.Y.Z>');
const changelog = readFileSync('CHANGELOG.md', 'utf8');

if (command === 'notes') {
  const notes = changelogSection(changelog, version);
  if (notes) console.log(notes);
} else {
  // A malformed version never reaches git or the API.
  const form = versionError(version);
  const env = (name: string) => process.env[name] ?? '';
  const errors = form ? [form] : releaseErrors({
    version,
    prerelease: env('PRERELEASE'),
    ref: env('GITHUB_REF'),
    sha: env('GITHUB_SHA'),
    packageVersion: (JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }).version,
    changelog,
    tagExists: execFileSync('git', ['ls-remote', '--tags', 'origin', `refs/tags/v${version}`], { encoding: 'utf8' }).trim() !== '',
    ciRun: (JSON.parse(execFileSync('gh', [
      'api', `repos/${env('GITHUB_REPOSITORY')}/actions/workflows/ci.yml/runs?head_sha=${env('GITHUB_SHA')}&per_page=1`,
    ], { encoding: 'utf8' })) as { workflow_runs: CiRun[] }).workflow_runs[0] ?? null,
  });
  for (const e of errors) console.log(`::error title=Release check::${e}`);
  if (errors.length > 0) process.exit(1);
  console.log(`Release checks passed for v${version} on ${env('GITHUB_SHA')}.`);
}
