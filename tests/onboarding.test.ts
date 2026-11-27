import { describe, expect, it } from 'vitest';
import { COLUMN_SHOWN, guideAllows, guideStep, needsGuide, needsMapHint, tipOnBlockedTap, tipOnFullBelt, tipAllowed, tipOnLevelStart, tipOnReturn, tipsAnticipated, tipsPresent } from '../src/core/onboarding';
import { defaultProgress, markTipSeen, sanitize } from '../src/core/progress';
import { BLUE, RED, YELLOW, level } from './helpers';
import levelsJson from '../src/levels/levels.json' with { type: 'json' };
import { parseLevel, type LevelDef } from '../src/core/level';

describe('onboarding', () => {
  const first = level(['RR'], [[[RED, 2]]], { id: 1 });
  const mixed = level(['O'], [[[RED, 1]], [[YELLOW, 1]]], { id: 4 });

  describe('map hint (#190)', () => {
    it('shows on first launch', () => {
      const p = defaultProgress();
      expect(needsMapHint(p.completed, p.seenTips)).toBe(true);
    });

    it('is gone once a level has been entered from the map', () => {
      const p = markTipSeen(defaultProgress(), 'map');
      expect(needsMapHint(p.completed, p.seenTips)).toBe(false);
    });

    it('survives a save round-trip once marked', () => {
      const p = sanitize(JSON.parse(JSON.stringify(markTipSeen(defaultProgress(), 'map'))));
      expect(needsMapHint(p.completed, p.seenTips)).toBe(false);
    });

    it('shows for an old save without seenTips that never played', () => {
      const p = sanitize({ unlocked: 1, completed: [] });
      expect(p.seenTips).toEqual([]);
      expect(needsMapHint(p.completed, p.seenTips)).toBe(true);
    });

    it('stays hidden for an old save that already played', () => {
      const p = sanitize({ unlocked: 3, completed: [1, 2] });
      expect(needsMapHint(p.completed, p.seenTips)).toBe(false);
      expect(needsMapHint([], ['guide'])).toBe(false); // entered level 1 but never finished it
    });
  });

  it('guides level 1 only until it has been seen', () => {
    expect(needsGuide(first, [])).toBe(true);
    expect(needsGuide(first, ['guide'])).toBe(false);
    expect(needsGuide(mixed, [])).toBe(false);
    expect(needsGuide(level(['RR'], [[[RED, 2]]], { id: 2 }), [])).toBe(false); // only level 1 is guided
  });

  it('explains mixing on the first level with secondaries, once', () => {
    expect(tipOnLevelStart(first, [])).toBeNull();
    expect(tipOnLevelStart(mixed, [])).toBe('mixing');
    expect(tipOnLevelStart(mixed, ['mixing'])).toBeNull();
  });

  it('explains ice and hidden pixels the first time they appear, one tip per level start', () => {
    const iced = level(['RO'], [[[RED, 3]], [[YELLOW, 1]]], { id: 31, overlay: ['i.'] });
    const hidden = level(['RB'], [[[RED, 1]], [[BLUE, 1]]], { id: 51, overlay: ['.h'] });
    expect(tipOnLevelStart(iced, [])).toBe('mixing');
    expect(tipOnLevelStart(iced, ['mixing'])).toBe('ice');
    expect(tipOnLevelStart(iced, ['mixing', 'ice'])).toBeNull();
    expect(tipOnLevelStart(hidden, [])).toBe('hidden');
  });

  it('shows the ice + film pair card once both are known, after the cards of the two halves (#268)', () => {
    const pair = level(['RO'], [[[RED, 3]], [[YELLOW, 1]], [[BLUE, 1]]], { id: 421, overlay: ['ib'] });
    expect(tipsPresent(pair)).toEqual(['mixing', 'ice', 'film', 'iceFilm']);
    expect(tipOnLevelStart(pair, ['mixing'])).toBe('ice');
    expect(tipOnLevelStart(pair, ['mixing', 'ice'])).toBe('film');
    expect(tipOnLevelStart(pair, ['mixing', 'ice', 'film'])).toBe('iceFilm');
    expect(tipOnLevelStart(pair, ['mixing', 'ice', 'film', 'iceFilm'])).toBeNull();
    // One half alone is no pair.
    expect(tipsPresent(level(['RO'], [[[RED, 3]], [[YELLOW, 1]]], { overlay: ['i.'] }))).not.toContain('iceFilm');
    expect(tipsPresent(level(['RO'], [[[RED, 2]], [[YELLOW, 1]], [[BLUE, 1]]], { overlay: ['.b'] }))).not.toContain('iceFilm');
    // It teaches, so it obeys the one-card-per-level rule (#177).
    expect(tipAllowed('iceFilm', ['ice'])).toBe(false);
    expect(tipAllowed('iceFilm', ['belt'])).toBe(true);
  });

  it('shows the ice + tunnel pair card once both are known, after the cards of the two halves (#270)', () => {
    const pair = level(['RR', 'RR'], [[[RED, 5]]], { id: 441, overlay: ['i.', '..'], tunnels: [0] });
    expect(tipsPresent(pair)).toEqual(['ice', 'tunnel', 'iceTunnel']);
    expect(tipOnLevelStart(pair, [])).toBe('ice');
    expect(tipOnLevelStart(pair, ['ice'])).toBe('tunnel');
    expect(tipOnLevelStart(pair, ['ice', 'tunnel'])).toBe('iceTunnel');
    expect(tipOnLevelStart(pair, ['ice', 'tunnel', 'iceTunnel'])).toBeNull();
    // One half alone is no pair, and the other pair (ice + film) is a different card.
    expect(tipsPresent(level(['RR', 'RR'], [[[RED, 4]]], { tunnels: [0] }))).not.toContain('iceTunnel');
    expect(tipsPresent(level(['RR', 'RR'], [[[RED, 5]]], { overlay: ['i.', '..'] }))).not.toContain('iceTunnel');
    expect(tipsPresent(pair)).not.toContain('iceFilm');
    // It teaches, so it obeys the one-card-per-level rule (#177).
    expect(tipAllowed('iceTunnel', ['tunnel'])).toBe(false);
    expect(tipAllowed('iceTunnel', ['belt'])).toBe(true);
  });

  it('shows the hidden + film pair card once both are known, after the cards of the two halves (#272)', () => {
    const pair = level(['RR', 'RR'], [[[RED, 4]], [[BLUE, 1]]], { id: 461, overlay: ['hb', '..'] });
    expect(tipsPresent(pair)).toEqual(['film', 'hidden', 'hiddenFilm']);
    expect(tipOnLevelStart(pair, [])).toBe('film');
    expect(tipOnLevelStart(pair, ['film'])).toBe('hidden');
    expect(tipOnLevelStart(pair, ['film', 'hidden'])).toBe('hiddenFilm');
    expect(tipOnLevelStart(pair, ['film', 'hidden', 'hiddenFilm'])).toBeNull();
    // One half alone is no pair, and the other pairs (ice + film, ice + tunnel) are different cards.
    expect(tipsPresent(level(['RR', 'RR'], [[[RED, 4]]], { overlay: ['h.', '..'] }))).not.toContain('hiddenFilm');
    expect(tipsPresent(level(['RR', 'RR'], [[[RED, 4]], [[BLUE, 1]]], { overlay: ['.b', '..'] }))).not.toContain('hiddenFilm');
    expect(tipsPresent(pair)).not.toContain('iceFilm');
    // It teaches, so it obeys the one-card-per-level rule (#177).
    expect(tipAllowed('hiddenFilm', ['film'])).toBe(false);
    expect(tipAllowed('hiddenFilm', ['belt'])).toBe(true);
  });

  it('shows the hidden + tunnel pair card once both are known, after the cards of the two halves (#274)', () => {
    const pair = level(['RR', 'RR'], [[[RED, 4]]], { id: 481, overlay: ['h.', '..'], tunnels: [0] });
    expect(tipsPresent(pair)).toEqual(['tunnel', 'hidden', 'hiddenTunnel']);
    expect(tipOnLevelStart(pair, [])).toBe('tunnel');
    expect(tipOnLevelStart(pair, ['tunnel'])).toBe('hidden');
    expect(tipOnLevelStart(pair, ['tunnel', 'hidden'])).toBe('hiddenTunnel');
    expect(tipOnLevelStart(pair, ['tunnel', 'hidden', 'hiddenTunnel'])).toBeNull();
    // One half alone is no pair, and the other pairs with a "?" or a tunnel (hidden + film, ice + tunnel) are different cards.
    expect(tipsPresent(level(['RR', 'RR'], [[[RED, 4]]], { overlay: ['h.', '..'] }))).not.toContain('hiddenTunnel');
    expect(tipsPresent(level(['RR', 'RR'], [[[RED, 4]]], { tunnels: [0] }))).not.toContain('hiddenTunnel');
    expect(tipsPresent(pair)).not.toContain('hiddenFilm');
    expect(tipsPresent(pair)).not.toContain('iceTunnel');
    // It teaches, so it obeys the one-card-per-level rule (#177).
    expect(tipAllowed('hiddenTunnel', ['tunnel'])).toBe(false);
    expect(tipAllowed('hiddenTunnel', ['belt'])).toBe(true);
  });

  it('lists every level-start mechanic on the board, in the order the tips show (#182)', () => {
    const iced = level(['RO'], [[[RED, 3]], [[YELLOW, 1]]], { id: 31, overlay: ['i.'] });
    expect(tipsPresent(iced)).toEqual(['mixing', 'ice']);
    expect(tipsPresent(level(['R'], [[[RED, 1]]]))).toEqual([]);
    expect(tipsPresent(level(['RB'], [[[RED, 1]], [[BLUE, 1]]], { overlay: ['.h'] }))).toEqual(['hidden']);
  });

  it('explains blocked lanes before slots when a bucket could not shoot', () => {
    expect(tipOnReturn(false, [])).toBe('blocked');
    expect(tipOnReturn(true, [])).toBe('slots');
    expect(tipOnReturn(false, ['blocked'])).toBe('slots');
    expect(tipOnReturn(false, ['blocked', 'slots'])).toBeNull();
  });

  it('explains why a bucket came back once the slots are known, only for one that painted (#172)', () => {
    expect(tipOnReturn(true, ['slots'])).toBe('leftover');
    expect(tipOnReturn(true, ['blocked', 'slots'])).toBe('leftover');
    expect(tipOnReturn(false, ['blocked', 'slots'])).toBeNull(); // landed nothing: it is a blocked lane, not a leftover
    expect(tipOnReturn(true, ['slots', 'leftover'])).toBeNull();
  });

  it('shows at most one teaching card per level, never holding back a corrective one (#177)', () => {
    expect(tipAllowed('slots', [])).toBe(true);
    expect(tipAllowed('leftover', ['slots'])).toBe(false);
    expect(tipAllowed('slots', ['mixing'])).toBe(false);
    expect(tipAllowed('slots', ['blocked'])).toBe(true); // a corrective card does not use up the level's one
    expect(tipAllowed('slots', ['belt', 'blocked'])).toBe(true);
    expect(tipAllowed('blocked', ['slots'])).toBe(true);
    expect(tipAllowed('belt', ['mixing', 'slots'])).toBe(true);
  });

  it('keeps "why it came back" for a later level when the slots card already showed in this one (#177)', () => {
    expect(tipOnReturn(true, [], [])).toBe('slots');
    expect(tipOnReturn(true, ['slots'], ['slots'])).toBeNull(); // level 2: second return, same level
    expect(tipOnReturn(true, ['slots'], [])).toBe('leftover'); // next level, first card there
    expect(tipOnReturn(true, [], ['queue'])).toBeNull(); // a level-start card already showed: slots waits too
    expect(tipOnReturn(false, [], ['queue'])).toBe('blocked'); // a bucket that landed nothing is always explained
    expect(tipOnReturn(true, ['slots'], ['blocked'])).toBe('leftover');
  });

  it('explains a blocked lane when a waiting bucket is refused, once (#146)', () => {
    expect(tipOnBlockedTap([])).toBe('blocked');
    expect(tipOnBlockedTap(['slots'])).toBe('blocked');
    expect(tipOnBlockedTap(['blocked'])).toBeNull();
  });

  it('explains "+N" the first time a column holds more buckets than it shows, after any other new tip (#148)', () => {
    const tall = level(['R'.repeat(4)], [[[RED, 1], [RED, 1], [RED, 1], [RED, 1]]], { id: 5 });
    const short = level(['R'.repeat(3)], [[[RED, 1], [RED, 1], [RED, 1]]], { id: 5 });
    expect(COLUMN_SHOWN).toBe(3);
    expect(tipOnLevelStart(tall, [])).toBe('queue');
    expect(tipOnLevelStart(tall, ['queue'])).toBeNull();
    expect(tipOnLevelStart(short, [])).toBeNull();
    const mixedTall = level(['ORR'], [[[RED, 1], [RED, 1], [RED, 1], [YELLOW, 1]]], { id: 5 });
    expect(tipOnLevelStart(mixedTall, [])).toBe('mixing');
    expect(tipOnLevelStart(mixedTall, ['mixing'])).toBe('queue');
  });

  it('explains the belt limit the first time a full belt refuses a launch, once', () => {
    expect(tipOnFullBelt([])).toBe('belt');
    expect(tipOnFullBelt(['guide', 'slots'])).toBe('belt');
    expect(tipOnFullBelt(['belt'])).toBeNull();
  });

  it('walks the guided steps', () => {
    expect(guideStep(0, false)).toBe('tap');
    expect(guideStep(1, true)).toBe('watch');
    expect(guideStep(1, false)).toBe('next');
    expect(guideStep(2, true)).toBe('free');
  });

  it('accepts only the highlighted column during guided steps', () => {
    expect(guideAllows('tap', 0, 0)).toBe(true);
    expect(guideAllows('tap', 1, 0)).toBe(false);
    expect(guideAllows('tap', null, 0)).toBe(false); // slots or empty space
    expect(guideAllows('watch', 0, 0)).toBe(false);
    expect(guideAllows('next', 1, 1)).toBe(true);
    expect(guideAllows('free', null, 0)).toBe(true);
  });
});

describe('anticipated cards (#225)', () => {
  const real = (id: number) => parseLevel((levelsJson as LevelDef[]).find((l) => l.id === id)!);
  const base = ['guide', 'slots', 'belt'];

  it('waits for the slots card, which level 2 shows at the first return', () => {
    expect(tipsAnticipated(real(2), ['guide'])).toEqual([]);
    expect(tipOnLevelStart(real(2), ['guide'])).toBeNull();
    expect(tipOnLevelStart(real(2), [])).toBeNull();
  });

  it('shows "why it came back" then "lane blocked" at the first levels where the case can happen, once each', () => {
    expect(tipsAnticipated(real(3), base)).toEqual(['leftover', 'blocked']);
    expect(tipOnLevelStart(real(3), base)).toBe('leftover');
    expect(tipOnLevelStart(real(3), [...base, 'leftover'])).toBe('blocked');
    expect(tipOnLevelStart(real(3), [...base, 'leftover', 'blocked'])).toBeNull();
    // A level with no blocked case never asks for the blocked card.
    expect(tipsAnticipated(real(6), base)).toEqual(['leftover']);
    expect(tipOnLevelStart(real(6), [...base, 'leftover'])).toBeNull();
  });

  it('keeps a new mechanic card ahead of the anticipated ones', () => {
    expect(tipOnLevelStart(real(4), base)).toBe('mixing');
    expect(tipOnLevelStart(real(4), [...base, 'mixing'])).toBe('leftover');
  });

  it('shows "why it came back" at the first level of universe 3 for a player who never met it', () => {
    const seen = ['guide', 'slots', 'belt', 'mixing', 'brown', 'ice', 'hidden', 'stone', 'lock', 'covered', 'queue'];
    for (const id of [244, 287]) expect(tipOnLevelStart(real(id), seen)).toBe('leftover');
    expect(tipOnLevelStart(real(244), [...seen, 'leftover'])).toBeNull();
  });

  it('is not needed when the board cannot make a bucket come back or get blocked', () => {
    expect(tipsAnticipated(real(1), base)).toEqual([]);
    expect(tipsAnticipated(real(5), base)).toEqual([]);
    expect(tipOnLevelStart(real(1), base)).toBeNull();
  });

  it('leaves saves as they are: a card already seen never shows again, and an old save needs no migration', () => {
    const old = sanitize({ unlocked: 5, completed: [1, 2], seenTips: ['guide', 'slots', 'leftover', 'blocked'] }, []);
    expect(old.seenTips).toEqual(['guide', 'slots', 'leftover', 'blocked']);
    expect(tipOnLevelStart(real(3), old.seenTips)).toBeNull();
  });
});

