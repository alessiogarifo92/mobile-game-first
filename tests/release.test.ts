import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { changelogSection, releaseErrors, versionError, type ReleaseFacts } from '../scripts/release/checks';

const CHANGELOG = [
  '# Changelog',
  '',
  '## Non rilasciato',
  '',
  '## 0.6.10 — later',
  '',
  'Ten.',
  '',
  '## 0.6.1 — fixes (25 novembre 2026)',
  '',
  'One.',
  '',
  '### Detail (#1)',
  '',
  '- a line',
  '',
  '## 0.6.0',
  '',
  'Zero.',
  '## 0.5.0 — empty',
  '   ',
  '',
  '## 0.4.0',
].join('\n');

const SHA = 'abc123';
const green = { status: 'completed', conclusion: 'success', html_url: 'https://ci/1' };

/** Facts of a release run that passes every check; each test breaks one. */
function facts(over: Partial<ReleaseFacts> = {}): ReleaseFacts {
  return {
    version: '0.6.1', prerelease: '', ref: 'refs/heads/main', sha: SHA, packageVersion: '0.6.1', changelog: CHANGELOG,
    tagExists: false, ciRun: green, ...over,
  };
}

describe('versionError', () => {
  it('accepts X.Y.Z', () => {
    expect(versionError('0.6.1')).toBeNull();
    expect(versionError('1.0.0')).toBeNull();
    expect(versionError('10.20.30')).toBeNull();
  });

  it('refuses a leading v, a suffix, missing parts, spaces and the empty string', () => {
    for (const v of ['v0.6.1', '0.6.1-rc.1', '0.6', '0.6.1.2', ' 0.6.1', '0.6.1 ', '0.6.x', '', '0.6.1\n']) {
      expect(versionError(v), JSON.stringify(v)).toMatch(/X\.Y\.Z/);
    }
  });

  it('points a suffix to the prerelease input', () => {
    expect(versionError('0.6.1-rc.1')).toMatch(/prerelease/);
  });
});

describe('changelogSection', () => {
  it('is the body under the exact heading, up to the next version', () => {
    expect(changelogSection(CHANGELOG, '0.6.1')).toBe('\nOne.\n\n### Detail (#1)\n\n- a line\n');
  });

  it('matches the version exactly: 0.6.1 is not the 0.6.10 section', () => {
    expect(changelogSection(CHANGELOG, '0.6.10')).toBe('\nTen.\n');
  });

  it('a heading with nothing after the version', () => {
    expect(changelogSection(CHANGELOG, '0.6.0')).toBe('\nZero.');
  });

  it('the last section runs to the end of the file', () => {
    expect(changelogSection(CHANGELOG, '0.4.0')).toBe('');
    expect(changelogSection('## 0.1.0\n\n- first\n', '0.1.0')).toBe('\n- first');
  });

  it('null when there is no such heading', () => {
    expect(changelogSection(CHANGELOG, '0.7.0')).toBeNull();
    expect(changelogSection(CHANGELOG, '0.6')).toBeNull();
  });

  it('reads the real CHANGELOG: 0.6.0 has its notes and stops before 0.5.0', () => {
    const real = readFileSync('CHANGELOG.md', 'utf8');
    const notes = changelogSection(real, '0.6.0');
    expect(notes).toContain('Duecento livelli nuovi');
    expect(notes).not.toContain('## 0.5.0');
  });
});

describe('releaseErrors', () => {
  it('no error when every check passes', () => {
    expect(releaseErrors(facts())).toEqual([]);
  });

  it('a malformed version is the only error reported', () => {
    expect(releaseErrors(facts({ version: 'v0.6.1', ref: 'refs/heads/x', tagExists: true }))).toEqual([versionError('v0.6.1')]);
  });

  it('refuses both a version and a prerelease', () => {
    expect(releaseErrors(facts({ prerelease: 'v0.6.1-rc.1' }))).toEqual([expect.stringMatching(/not both/)]);
  });

  it('runs only on main', () => {
    expect(releaseErrors(facts({ ref: 'refs/heads/release-workflow' }))).toEqual([expect.stringMatching(/main.*refs\/heads\/release-workflow/)]);
    expect(releaseErrors(facts({ ref: 'refs/tags/v0.6.0' }))).toHaveLength(1);
  });

  it('the version is the one in package.json', () => {
    expect(releaseErrors(facts({ packageVersion: '0.6.0' }))).toEqual([expect.stringMatching(/package\.json.*0\.6\.0.*0\.6\.1/)]);
  });

  it('CHANGELOG.md has the section, and it is not empty', () => {
    expect(releaseErrors(facts({ version: '0.7.0', packageVersion: '0.7.0' }))).toEqual([expect.stringMatching(/no "## 0\.7\.0" section/)]);
    expect(releaseErrors(facts({ version: '0.5.0', packageVersion: '0.5.0' }))).toEqual([expect.stringMatching(/"## 0\.5\.0" section .* is empty/)]);
    expect(releaseErrors(facts({ version: '0.4.0', packageVersion: '0.4.0' }))).toEqual([expect.stringMatching(/is empty/)]);
  });

  it('the tag does not exist yet', () => {
    expect(releaseErrors(facts({ tagExists: true }))).toEqual([expect.stringMatching(/v0\.6\.1 already exists/)]);
  });

  it('CI on the commit: missing, still running, or not green', () => {
    expect(releaseErrors(facts({ ciRun: null }))).toEqual([expect.stringMatching(/No CI run.*abc123/)]);
    expect(releaseErrors(facts({ ciRun: { status: 'in_progress', conclusion: null, html_url: 'https://ci/2' } })))
      .toEqual([expect.stringMatching(/still in_progress.*https:\/\/ci\/2/)]);
    for (const conclusion of ['failure', 'cancelled', 'timed_out', 'skipped', null]) {
      expect(releaseErrors(facts({ ciRun: { status: 'completed', conclusion, html_url: 'https://ci/3' } })), String(conclusion))
        .toEqual([expect.stringMatching(/ended with .*https:\/\/ci\/3/)]);
    }
  });

  it('reports every failed check at once', () => {
    const errors = releaseErrors(facts({ prerelease: 'v1.0.0-rc.1', ref: 'refs/heads/x', packageVersion: '0.6.0', tagExists: true, ciRun: null }));
    expect(errors).toHaveLength(5);
  });
});
