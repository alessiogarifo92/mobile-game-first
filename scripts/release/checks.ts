/**
 * The checks a release run of the *Android APK* workflow passes before it builds or creates anything (version input,
 * `dry_run`). Pure: the CLI (`cli.ts`) reads package.json, CHANGELOG.md, the tags and the CI runs of the commit.
 */

/** The latest `ci.yml` run on the commit, as the REST API returns it (only the fields read here). */
export interface CiRun {
  status: string;
  conclusion: string | null;
  html_url: string;
}

export interface ReleaseFacts {
  /** The `version` input: X.Y.Z, without the `v` of the tag. */
  version: string;
  /** The `prerelease` input, which must stay empty on a release run. */
  prerelease: string;
  /** GITHUB_REF and GITHUB_SHA of the run. */
  ref: string;
  sha: string;
  packageVersion: string;
  changelog: string;
  tagExists: boolean;
  ciRun: CiRun | null;
}

/** Why `version` is not a plain X.Y.Z, or null when it is. */
export function versionError(version: string): string | null {
  if (/^\d+\.\d+\.\d+$/.test(version)) return null;
  return `Version ${JSON.stringify(version)} must be X.Y.Z, without "v" and without a suffix (a test build with a suffix goes through the prerelease input).`;
}

/**
 * The body of the `## <version>` section of the changelog, up to the next `## ` heading; null when there is none.
 * The heading is the version alone or followed by a space (`## 0.6.0 — title`), so 0.6.1 never reads the 0.6.10 notes.
 */
export function changelogSection(changelog: string, version: string): string | null {
  // The newline that ends the file is not an empty last line of the last section.
  const lines = changelog.replace(/\n$/, '').split('\n');
  const head = `## ${version}`;
  const start = lines.findIndex((l) => l === head || l.startsWith(`${head} `));
  if (start < 0) return null;
  const next = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start + 1, next < 0 ? undefined : next).join('\n');
}

/** Every check that fails, each with the message the run shows; empty when the release can go ahead. */
export function releaseErrors(f: ReleaseFacts): string[] {
  const form = versionError(f.version);
  if (form) return [form];
  const errors: string[] = [];
  if (f.prerelease !== '') errors.push(`Set either version (${f.version}) or prerelease (${f.prerelease}), not both.`);
  if (f.ref !== 'refs/heads/main') errors.push(`A release runs on main only; this run is on ${f.ref}.`);
  if (f.packageVersion !== f.version) {
    errors.push(`package.json is at version ${f.packageVersion}, not ${f.version}: bump it on main first.`);
  }
  const notes = changelogSection(f.changelog, f.version);
  if (notes === null) errors.push(`CHANGELOG.md has no "## ${f.version}" section.`);
  else if (notes.trim() === '') errors.push(`The "## ${f.version}" section of CHANGELOG.md is empty.`);
  if (f.tagExists) errors.push(`Tag v${f.version} already exists.`);
  if (!f.ciRun) errors.push(`No CI run (ci.yml) found for commit ${f.sha}.`);
  else if (f.ciRun.status !== 'completed') errors.push(`CI on this commit is still ${f.ciRun.status}: run again when it is green (${f.ciRun.html_url}).`);
  else if (f.ciRun.conclusion !== 'success') errors.push(`CI on this commit ended with ${f.ciRun.conclusion}, not success (${f.ciRun.html_url}).`);
  return errors;
}
