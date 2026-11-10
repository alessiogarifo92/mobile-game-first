import { describe, expect, it } from 'vitest';
import { PANEL_ARM_MS, PANEL_FADE_MS, jamHintKey, panelArmed } from '../src/core/panelInput';
import { translate } from '../src/core/i18n';

describe('panel input arming (#161)', () => {
  it('ignores taps right after the panel appears', () => {
    expect(panelArmed(1000, 1000)).toBe(false);
    expect(panelArmed(1000 + PANEL_ARM_MS - 1, 1000)).toBe(false);
  });
  it('accepts taps once the delay has passed', () => {
    expect(panelArmed(1000 + PANEL_ARM_MS, 1000)).toBe(true);
    expect(panelArmed(5000, 1000)).toBe(true);
  });
  it('is between 300 and 500 ms', () => {
    expect(PANEL_ARM_MS).toBeGreaterThanOrEqual(300);
    expect(PANEL_ARM_MS).toBeLessThanOrEqual(500);
  });
  it('honours a custom delay', () => {
    expect(panelArmed(150, 0, 100)).toBe(true);
    expect(panelArmed(50, 0, 100)).toBe(false);
  });
});

describe('win panel reveal (#178)', () => {
  it('fades in fast enough not to read as a delay', () => {
    expect(PANEL_FADE_MS).toBeGreaterThan(0);
    expect(PANEL_FADE_MS).toBeLessThanOrEqual(250);
  });
  it('is fully visible before its buttons arm, so no tap lands on a button the player cannot see yet', () => {
    expect(PANEL_FADE_MS).toBeLessThan(PANEL_ARM_MS);
    expect(panelArmed(PANEL_FADE_MS, 0)).toBe(false);
  });
});

describe('jam panel hint (#151)', () => {
  it('first jam says +1 slot works once per attempt; the second explains why only Retry is offered', () => {
    expect(jamHintKey(false)).toBe('jam.once');
    expect(jamHintKey(true)).toBe('jam.used');
    expect(translate('en', 'jam.once')).toContain('once per attempt');
    expect(translate('it', 'jam.once')).toContain('una volta per tentativo');
    expect(translate('en', 'jam.used')).toContain('already used');
    expect(translate('it', 'jam.used')).toContain('già usato');
  });
});
