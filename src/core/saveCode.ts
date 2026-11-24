import { sanitize, type LevelRef, type Progress } from './progress';

/**
 * Save code: the progress as a short text the player can copy somewhere safe and paste back after a reinstall,
 * on another phone or in the web version. Format `MS2.<base64url json>.<checksum>`: the prefix names the format
 * version, the checksum catches a code that was cut or mistyped.
 *
 * MS2 (#259) keeps the code short whatever the progress: one-letter keys, the completed levels as ranges
 * (`"1-166,170"`) and the tips as one comma-separated string. MS1, the progress object as it is, listed every
 * completed level and grew past 1 KB; codes exported in that format are still read.
 */
const PREFIX = 'MS2';
const LEGACY_PREFIX = 'MS1';
/** Most level ids a code may expand to, the same cap a loaded save applies. */
const MAX_IDS = 10_000;
const RANGES = /^(?:[1-9]\d*(?:-[1-9]\d*)?(?:,[1-9]\d*(?:-[1-9]\d*)?)*)?$/;

/** Sorted level ids as ranges: `[1, 2, 3, 5, 7, 8]` → `"1-3,5,7-8"`. */
export function formatRanges(ids: readonly number[]): string {
  const parts: string[] = [];
  for (let i = 0; i < ids.length; ) {
    let j = i;
    while (j + 1 < ids.length && ids[j + 1] === ids[j]! + 1) j++;
    parts.push(j === i ? `${ids[i]}` : `${ids[i]}-${ids[j]}`);
    i = j + 1;
  }
  return parts.join(',');
}

/** The ids of `formatRanges` text, or null if it is not one; a forged huge range stops at the cap. */
export function parseRanges(text: string): number[] | null {
  if (!RANGES.test(text)) return null;
  const ids: number[] = [];
  for (const part of text ? text.split(',') : []) {
    const [from, to = from] = part.split('-').map(Number) as [number, number?];
    if (to < from) return null;
    for (let n = from; n <= to && ids.length < MAX_IDS; n++) ids.push(n);
  }
  return ids;
}

function checksum(text: string): string {
  // FNV-1a, 32 bit: not security, just typo detection.
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}

function toBase64Url(text: string): string {
  return btoa(text).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, '+').replace(/_/g, '/');
  return atob(padded + '='.repeat((4 - (padded.length % 4)) % 4));
}

export function exportSaveCode(progress: Progress): string {
  const compact = {
    u: progress.unlocked,
    c: formatRanges(progress.completed),
    s: progress.sound,
    l: progress.language,
    t: progress.seenTips.join(','),
    k: progress.skin,
    d: progress.defeats,
  };
  const body = toBase64Url(JSON.stringify(compact));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

/** The MS2 body back in the progress' own shape (still unchecked), or null if its shape is not MS2's. */
function expand(raw: Record<string, unknown>): Record<string, unknown> | null {
  if (typeof raw.c !== 'string' || typeof raw.t !== 'string') return null;
  const completed = parseRanges(raw.c);
  if (!completed) return null;
  return { unlocked: raw.u, completed, sound: raw.s, language: raw.l, seenTips: raw.t.split(',').filter(Boolean), skin: raw.k, defeats: raw.d };
}

/** Returns the progress in the code, checked against the real levels, or null if the code is not valid. */
export function importSaveCode(code: string, levels: readonly LevelRef[]): Progress | null {
  // Pasted codes often carry spaces or line breaks from the chat or the notes app.
  const [prefix, body, sum, ...rest] = code.replace(/\s+/g, '').split('.');
  if ((prefix !== PREFIX && prefix !== LEGACY_PREFIX) || !body || !sum || rest.length > 0 || checksum(body) !== sum) return null;
  try {
    const raw: unknown = JSON.parse(fromBase64Url(body));
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const progress = prefix === PREFIX ? expand(raw as Record<string, unknown>) : raw;
    return progress ? sanitize(progress, levels) : null;
  } catch {
    return null;
  }
}

/** How far along a save is, to warn before an import would replace a more advanced one. */
export function progressScore(progress: Progress): number {
  return progress.completed.length * 1000 + progress.unlocked;
}
