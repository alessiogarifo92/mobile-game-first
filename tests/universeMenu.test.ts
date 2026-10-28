import { describe, expect, it } from 'vitest';
import { BLUE, RED } from '../src/core/colors';
import { SELECTOR, cardAt, mapUniverse, newlyCompletedUniverse, selectorLayout, universeCards } from '../src/core/universeMenu';
import type { UniverseInfo } from '../src/core/universes';

const game = (n: number) => Array.from({ length: n }, (_, i) => ({ id: i + 1, stage: Math.floor(i / 10) + 1 }));
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);
const universes: UniverseInfo[] = [
  { id: 1, key: 'atelier', color: 'R', maxCanvas: 14 },
  { id: 2, key: 'nature', color: 'B', maxCanvas: 14 },
  { id: 3, key: 'travel', color: 'R', maxCanvas: 14 },
];

describe('universe cards', () => {
  it('lists the universes that have levels, open or closed, with their progress', () => {
    const cards = universeCards(universes, game(205), [...range(1, 40)]);
    expect(cards.map((c) => [c.id, c.open, c.done, c.total, c.complete, c.firstLevel])).toEqual([
      [1, true, 40, 100, true, 1],
      [2, false, 0, 100, true, 101],
      [3, false, 0, 5, false, 201],
    ]);
    expect(cards.map((c) => c.unlockLevel)).toEqual([undefined, 100, 200]);
    expect(cards.map((c) => c.color)).toEqual([RED, BLUE, RED]);
  });

  it('opens the next card with the last level of the previous universe', () => {
    const cards = universeCards(universes, game(205), range(1, 100));
    expect(cards.map((c) => c.open)).toEqual([true, true, false]);
    expect(cards[0]!.done).toBe(100);
  });

  it('shows no card for a universe without levels', () => {
    expect(universeCards(universes, game(100), []).map((c) => c.id)).toEqual([1]);
  });
});

describe('map universe', () => {
  const levels = game(300);
  it('opens on the universe of the current level', () => {
    expect(mapUniverse(levels, { unlocked: 1, completed: [] })).toBe(1);
    expect(mapUniverse(levels, { unlocked: 101, completed: range(1, 100) })).toBe(2);
    expect(mapUniverse(levels, { unlocked: 150, completed: range(1, 149) })).toBe(2);
  });

  it('shows an open universe asked for, never a closed one', () => {
    expect(mapUniverse(levels, { unlocked: 150, completed: range(1, 149) }, 1)).toBe(1);
    expect(mapUniverse(levels, { unlocked: 50, completed: range(1, 49) }, 2)).toBe(1);
    expect(mapUniverse(levels, { unlocked: 50, completed: range(1, 49) }, 9)).toBe(1);
  });

  it('falls back to universe 1 for a game with no levels', () => {
    expect(mapUniverse([], { unlocked: 1, completed: [] })).toBe(1);
  });
});

describe('end of a universe', () => {
  const levels = game(205);
  it('is celebrated once, on the win that completes every level of a full universe', () => {
    expect(newlyCompletedUniverse(levels, range(1, 99), 100)).toBe(1);
    expect(newlyCompletedUniverse(levels, range(1, 199), 200)).toBe(2);
    expect(newlyCompletedUniverse(levels, range(1, 100), 100)).toBeNull(); // replay
  });

  it('needs every level and the last one', () => {
    expect(newlyCompletedUniverse(levels, range(2, 99), 100)).toBeNull(); // level 1 missing
    expect(newlyCompletedUniverse(levels, [...range(1, 98), 100], 99)).toBeNull(); // not the last level
    expect(newlyCompletedUniverse(levels, range(1, 204), 205)).toBeNull(); // universe 3 is not complete
    expect(newlyCompletedUniverse(levels, [], 999)).toBeNull();
  });
});

describe('selector layout', () => {
  it.each([1, 2, 3, 5])('stacks %i cards inside the screen at 1280 and 1700, without overlap', (count) => {
    for (const viewHeight of [1280, 1700]) {
      const { cards, height } = selectorLayout(count, 720, viewHeight);
      expect(cards).toHaveLength(count);
      expect(height).toBe(viewHeight);
      for (const c of cards) {
        expect(c.x).toBe(SELECTOR.side);
        expect(c.x + c.w).toBe(720 - SELECTOR.side);
        expect(c.y).toBeGreaterThanOrEqual(SELECTOR.top);
        expect(c.y + c.h).toBeLessThanOrEqual(viewHeight - SELECTOR.bottomPad);
        expect(c.h).toBeGreaterThanOrEqual(SELECTOR.minCard);
        expect(c.h).toBeLessThanOrEqual(SELECTOR.maxCard);
      }
      for (let i = 1; i < count; i++) expect(cards[i]!.y - (cards[i - 1]!.y + cards[i - 1]!.h)).toBe(SELECTOR.gap);
    }
  });

  it('keeps cards readable when many universes do not fit: the content grows past the view', () => {
    const { cards, height } = selectorLayout(8, 720, 1280);
    expect(cards.every((c) => c.h === SELECTOR.minCard)).toBe(true);
    expect(height).toBeGreaterThan(1280);
    expect(selectorLayout(0, 720, 1280)).toEqual({ cards: [], height: 1280 });
  });

  it('finds the tapped card', () => {
    const { cards } = selectorLayout(3, 720, 1280);
    expect(cardAt(cards, 360, cards[1]!.y + 10)).toBe(1);
    expect(cardAt(cards, 10, cards[1]!.y + 10)).toBe(-1);
    expect(cardAt(cards, 360, cards[0]!.y + cards[0]!.h + SELECTOR.gap / 2)).toBe(-1);
  });
});
