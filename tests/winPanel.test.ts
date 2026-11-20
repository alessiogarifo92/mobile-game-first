import { describe, expect, it } from 'vitest';
import { VIEW } from '../src/core/layout';
import { winPanelLayout, winPanelTop } from '../src/core/winPanel';

describe('win panel layout (#153)', () => {
  it('keeps the layout from before #153 when no stage reward shows', () => {
    const l = winPanelLayout(false);
    expect(l).toMatchObject({ height: 812, picture: 140, pictureSize: 240, next: 652, second: 752, card: null, hint: null });
  });

  it('adds a reward card between the stage line and the universe progress', () => {
    const l = winPanelLayout(true);
    const card = l.card!;
    expect(card.top).toBeGreaterThan(l.stage + 36);
    expect(card.jars - card.jarSize / 2).toBeGreaterThan(card.top);
    // The use button (76 tall) sits under the jars and inside the card.
    expect(card.use - 38).toBeGreaterThan(card.jars + card.jarSize / 2);
    expect(card.use + 38).toBeLessThan(card.top + card.height);
    expect(l.hint!).toBeGreaterThan(card.top + card.height);
    expect(l.progress).toBeGreaterThan(l.hint! + 36);
  });

  it('stacks every part in order, inside the panel', () => {
    for (const l of [winPanelLayout(false), winPanelLayout(true)]) {
      expect(l.picture + l.pictureSize).toBeLessThan(l.summary - 12);
      expect(l.summary).toBeLessThan(l.stage);
      // Next (88 tall) under the progress bar, the second button (64 tall) under Next, and both inside the panel.
      expect(l.next - 44).toBeGreaterThan(l.progress + 8);
      expect(l.second - 32).toBeGreaterThan(l.next + 44);
      expect(l.second + 32).toBeLessThan(l.height);
    }
  });

  it('leaves two lines for the summary and two for the stage message, never overlapping (#229)', () => {
    const LINE = 28 * 1.3; // THEME.type.sm, with the line height Phaser gives it
    for (const l of [winPanelLayout(false), winPanelLayout(true)]) {
      expect(l.summary - LINE).toBeGreaterThanOrEqual(l.picture + l.pictureSize); // two lines, centred on `summary`
      expect(l.summary + LINE).toBeLessThanOrEqual(l.stage - LINE);
      const below = l.card ? l.card.top : l.progress;
      expect(l.stage + LINE).toBeLessThanOrEqual(below);
    }
  });

  it('fits on the shortest screen the game draws', () => {
    for (const l of [winPanelLayout(false), winPanelLayout(true)]) {
      const top = winPanelTop(l, VIEW.height);
      expect(top).toBeGreaterThanOrEqual(0);
      expect(top + l.height).toBeLessThanOrEqual(VIEW.height);
    }
    expect(winPanelTop(winPanelLayout(false), 1280)).toBe(234);
  });
});
