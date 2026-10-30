/**
 * Who plays in a playtest turn (#68): the turn config, one entry per agent with its profile from the protocol of #67
 * (§4) and its packs (§8). Pure, so a bad config fails before any browser starts.
 */

export interface AgentSpec {
  agentId: string;
  profileId: string;
  model?: string;
  viewport: { width: number; height: number };
  language: 'it' | 'en';
  packs: string[];
  /** Attempts per level before the harness skips it (the profile's limit); none means no limit. */
  maxAttempts: number | null;
}

export interface TurnSpec {
  turn: number;
  tag?: string;
  variant: 'normale' | 'senza-copertura';
  agents: AgentSpec[];
}

/** The container runs a turn of 4–5 agents; more than this would starve each browser of CPU. */
export const MAX_AGENTS = 6;
const VIEWPORTS = ['360x640', '412x915'];

export class TurnError extends Error {}

export function sessionId(turn: number, agentId: string): string {
  return `T${String(turn).padStart(2, '0')}-${agentId}`;
}

export function parseViewport(text: string): { width: number; height: number } {
  if (!VIEWPORTS.includes(text)) throw new TurnError(`viewport "${text}" is not one of ${VIEWPORTS.join(', ')}`);
  const [width, height] = text.split('x').map(Number) as [number, number];
  return { width, height };
}

function obj(v: unknown, where: string): Record<string, unknown> {
  if (!v || typeof v !== 'object' || Array.isArray(v)) throw new TurnError(`${where} must be an object`);
  return v as Record<string, unknown>;
}

function str(o: Record<string, unknown>, key: string, where: string, pattern?: RegExp, optional = false): string | undefined {
  const v = o[key];
  if (v === undefined && optional) return undefined;
  if (typeof v !== 'string' || (pattern && !pattern.test(v))) throw new TurnError(`${where}.${key} is missing or invalid (${JSON.stringify(v)})`);
  return v;
}

export function parseTurnConfig(raw: unknown): TurnSpec {
  const c = obj(raw, 'config');
  if (!Number.isInteger(c.turn) || (c.turn as number) < 1 || (c.turn as number) > 99) throw new TurnError('config.turn must be an integer from 1 to 99');
  const variant = c.variant ?? 'normale';
  if (variant !== 'normale' && variant !== 'senza-copertura') throw new TurnError('config.variant must be "normale" or "senza-copertura"');
  if (!Array.isArray(c.agents) || c.agents.length === 0) throw new TurnError('config.agents must be a non-empty array');
  if (c.agents.length > MAX_AGENTS) throw new TurnError(`at most ${MAX_AGENTS} agents per turn (got ${c.agents.length})`);
  const agents = c.agents.map((raw, i): AgentSpec => {
    const where = `agents[${i}]`;
    const e = obj(raw, where);
    const language = str(e, 'language', where, /^(it|en)$/) as 'it' | 'en';
    if (!Array.isArray(e.packs) || e.packs.length === 0 || !e.packs.every((p) => typeof p === 'string' && /^(U1-ONB|U1-FINE|S\d{2})$/.test(p))) {
      throw new TurnError(`${where}.packs must list packs like "U1-FINE", "S11"`);
    }
    const max = e.maxAttempts;
    if (max !== undefined && (!Number.isInteger(max) || (max as number) < 1)) throw new TurnError(`${where}.maxAttempts must be a positive integer`);
    const model = str(e, 'model', where, /./, true);
    return {
      agentId: str(e, 'agentId', where, /^A\d{2}$/)!,
      profileId: str(e, 'profileId', where, /^P\d{2}$/)!,
      ...(model ? { model } : {}),
      viewport: parseViewport(str(e, 'viewport', where)!),
      language,
      packs: e.packs as string[],
      maxAttempts: (max as number | undefined) ?? null,
    };
  });
  const dup = agents.find((a, i) => agents.findIndex((o) => o.agentId === a.agentId) !== i);
  if (dup) throw new TurnError(`agent "${dup.agentId}" is listed twice`);
  const tag = str(c, 'tag', 'config', /./, true);
  return { turn: c.turn as number, ...(tag ? { tag } : {}), variant, agents };
}
