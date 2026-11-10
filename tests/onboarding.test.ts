import { describe, expect, it } from 'vitest';
import { COLUMN_SHOWN, guideAllows, guideStep, needsGuide, tipOnBlockedTap, tipOnFullBelt, tipAllowed, tipOnLevelStart, tipOnReturn } from '../src/core/onboarding';
import { BLUE, RED, YELLOW, level } from './helpers';

describe('onboarding', () => {
  const first = level(['RR'], [[[RED, 2]]], { id: 1 });
  const mixed = level(['O'], [[[RED, 1]], [[YELLOW, 1]]], { id: 4 });

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
