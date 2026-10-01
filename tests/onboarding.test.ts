import { describe, expect, it } from 'vitest';
import { guideAllows, guideStep, needsGuide, tipOnLevelStart, tipOnReturn } from '../src/core/onboarding';
import { RED, YELLOW, level } from './helpers';

describe('onboarding', () => {
  const first = level(['RR'], [[[RED, 2]]], { id: 1 });
  const mixed = level(['O'], [[[RED, 1]], [[YELLOW, 1]]], { id: 4 });

  it('guides level 1 only until it has been seen', () => {
    expect(needsGuide(first, [])).toBe(true);
    expect(needsGuide(first, ['guide'])).toBe(false);
    expect(needsGuide(mixed, [])).toBe(false);
  });

  it('explains mixing on the first level with secondaries, once', () => {
    expect(tipOnLevelStart(first, [])).toBeNull();
    expect(tipOnLevelStart(mixed, [])).toBe('mixing');
    expect(tipOnLevelStart(mixed, ['mixing'])).toBeNull();
  });

  it('explains blocked lanes before slots when a bucket could not shoot', () => {
    expect(tipOnReturn(false, [])).toBe('blocked');
    expect(tipOnReturn(true, [])).toBe('slots');
    expect(tipOnReturn(false, ['blocked'])).toBe('slots');
    expect(tipOnReturn(false, ['blocked', 'slots'])).toBeNull();
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
