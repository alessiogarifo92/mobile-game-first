/** Alignment of the difficulty report with the shipped levels (#215). Pure: the test reads the files. */
export interface ReportAlignment {
  /** Ids in the report that levels.json no longer has: the report is wrong, this fails the test. */
  stale: number[];
  /** Ids in levels.json the report does not cover yet: only a warning, stage PRs are not blocked. */
  missing: number[];
}

export function reportAlignment(reportIds: readonly number[], levelIds: readonly number[]): ReportAlignment {
  const inReport = new Set(reportIds);
  const inLevels = new Set(levelIds);
  return {
    stale: reportIds.filter((id) => !inLevels.has(id)),
    missing: levelIds.filter((id) => !inReport.has(id)),
  };
}

/** The warning for missing ids (first few), with the regeneration command; empty when nothing is missing. */
export function missingWarning(missing: readonly number[], max = 5): string {
  if (!missing.length) return '';
  const first = missing.slice(0, max).join(', ');
  const more = missing.length > max ? ` (+${missing.length - max} more)` : '';
  return `difficulty report misses ${missing.length} level(s): ${first}${more}. Regenerate: CHROMIUM_PATH=/opt/pw-browsers/chromium npx tsx scripts/difficulty-report.ts and commit docs/reports/curva-difficolta.{json,png}`;
}
