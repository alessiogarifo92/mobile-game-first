import { sanitize, type LevelRef, type Progress } from './progress';

/**
 * Save code: the progress as a short text the player can copy somewhere safe and paste back after a reinstall,
 * on another phone or in the web version. Format `MS1.<base64url json>.<checksum>`: the prefix names the format
 * version, the checksum catches a code that was cut or mistyped.
 */
const PREFIX = 'MS1';

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
  const body = toBase64Url(JSON.stringify(progress));
  return `${PREFIX}.${body}.${checksum(body)}`;
}

/** Returns the progress in the code, checked against the real levels, or null if the code is not valid. */
export function importSaveCode(code: string, levels: readonly LevelRef[]): Progress | null {
  // Pasted codes often carry spaces or line breaks from the chat or the notes app.
  const [prefix, body, sum, ...rest] = code.replace(/\s+/g, '').split('.');
  if (prefix !== PREFIX || !body || !sum || rest.length > 0 || checksum(body) !== sum) return null;
  try {
    const raw: unknown = JSON.parse(fromBase64Url(body));
    return raw && typeof raw === 'object' ? sanitize(raw, levels) : null;
  } catch {
    return null;
  }
}

/** How far along a save is, to warn before an import would replace a more advanced one. */
export function progressScore(progress: Progress): number {
  return progress.completed.length * 1000 + progress.unlocked;
}
