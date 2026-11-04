import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aggregate, anomalyOf, coverageGaps, type Form, type FormLevel } from '../scripts/playtest/aggregate';

const example = JSON.parse(readFileSync('docs/playtest/scheda.esempio.json', 'utf8')) as Form;

const attempt = (outcome: string, extra: Partial<FormLevel['attempts'][number]> = {}) => ({
  outcome, refusals: 0, jams: 0, extraSlotUsed: false, painted: 10, targets: 10, ...extra,
});

function form(sessionId: string, levels: FormLevel[], over: Partial<Form> = {}): Form {
  return {
    sessionId,
    agent: { agentId: sessionId.slice(4), profileId: 'P0' + sessionId.slice(-1) },
    device: { viewport: '360x640', language: 'it' },
    endReason: 'piano-finito',
    levels,
    session: {},
    bugs: [],
    ...over,
  };
}

describe('anomalyOf', () => {
  it('flags a level that feels hard while random play wins it', () => {
    expect(anomalyOf(4, 0.8)).toBe('piu-duro-del-previsto');
  });
  it('flags a level that feels trivial while random play loses it', () => {
    expect(anomalyOf(2, 0.2)).toBe('piu-facile-del-previsto');
  });
  it('stays quiet in the middle or without data', () => {
    expect(anomalyOf(3, 0.8)).toBeNull();
    expect(anomalyOf(4, 0.5)).toBeNull();
    expect(anomalyOf(null, 0.5)).toBeNull();
    expect(anomalyOf(4, null)).toBeNull();
  });
});

describe('aggregate', () => {
  it('reads the example form of #67', () => {
    const agg = aggregate([example], { 101: 0.9 });
    expect(agg.sessions).toHaveLength(1);
    expect(agg.sessions[0]).toMatchObject({ sessionId: example.sessionId, endReason: example.endReason, fun: 3 });
    const l101 = agg.levels.find((l) => l.levelId === 101)!;
    expect(l101).toMatchObject({ agents: 1, wins: 1, firstTryWins: 1, randomWin: 0.9 });
    expect(l101.mechanics[0]).toMatchObject({ id: 'brown', understood: 4 });
    expect(agg.bugs[0]).toMatchObject({ id: 'T01-A02-B01', sessionId: example.sessionId, profileId: 'P02' });
  });

  it('merges sessions per level and counts losses, skips and moods', () => {
    const a = form('T01-A01', [
      { levelId: 5, result: 'saltato', attempts: [attempt('ingorgo', { jams: 1, painted: 7 }), attempt('riprova', { painted: 9, extraSlotUsed: true })],
        feedback: { understood: 2, perceivedDifficulty: 5, mood: 'frustrato', notUnderstood: ' perché si blocca ', wouldContinue: false, freeText: '' } },
      { levelId: 6, result: 'abbandonato', attempts: [] },
    ], { endReason: 'soglia-abbandono', session: { feedback: { fun: 2, wouldReturn: 1, stoppedBecause: 'troppo difficile' } } });
    const b = form('T01-A02', [
      { levelId: 5, result: 'vinto', attempts: [attempt('vinto', { refusals: 2, ticks: 300, durationMs: 4000 })],
        feedback: { understood: 4, perceivedDifficulty: 4, mood: 'divertito', notUnderstood: '', freeText: '' } },
      { levelId: 4, result: 'vinto', attempts: [attempt('ingorgo'), attempt('vinto')] },
    ]);
    const agg = aggregate([a, b], { 5: 0.75 });
    expect(agg.levels.map((l) => l.levelId)).toEqual([4, 5]);
    const l5 = agg.levels[1]!;
    expect(l5).toMatchObject({
      agents: 2, wins: 1, firstTryWins: 1, skipped: 1, attemptsMean: 1.5, jams: 1, refusals: 2, extraSlotUses: 1,
      missingPixelsOnLoss: [3, 1], winTicks: 300, winDurationMs: 4000, totalTicks: 300, perceivedDifficulty: 4.5, understood: 3, wouldNotContinue: 1, anomaly: 'piu-duro-del-previsto',
    });
    expect(l5.moods).toEqual({ divertito: 1, neutro: 0, annoiato: 0, frustrato: 1 });
    expect(l5.notUnderstood).toEqual([{ sessionId: 'T01-A01', text: 'perché si blocca' }]);
    const l4 = agg.levels[0]!;
    expect(l4).toMatchObject({ winTicks: null, winDurationMs: null, firstTryWins: 0, wins: 1, perceivedDifficulty: null, understood: null, randomWin: null, anomaly: null });
    expect(agg.sessions[0]).toMatchObject({ levelsPlayed: 1, wins: 0, skipped: 1, lastLevel: 5, fun: 2, wouldReturn: 1, stoppedBecause: 'troppo difficile' });
    expect(agg.sessions[1]).toMatchObject({ levelsPlayed: 2, wins: 2, lastLevel: 4, fun: null, wouldReturn: null, stoppedBecause: '' });
  });

  it('handles a session that never played', () => {
    const agg = aggregate([form('T01-A03', [])]);
    expect(agg.levels).toEqual([]);
    expect(agg.sessions[0]!.lastLevel).toBeNull();
  });
});

describe('coverageGaps', () => {
  it('lists the levels seen by too few sessions', () => {
    const agg = aggregate([
      form('T01-A01', [{ levelId: 1, result: 'vinto', attempts: [attempt('vinto')] }]),
      form('T01-A02', [{ levelId: 1, result: 'vinto', attempts: [attempt('vinto')] }, { levelId: 2, result: 'vinto', attempts: [attempt('vinto')] }]),
    ]);
    expect(coverageGaps(agg, [1, 2, 3], 2)).toEqual([{ levelId: 2, agents: 1 }, { levelId: 3, agents: 0 }]);
  });
});
