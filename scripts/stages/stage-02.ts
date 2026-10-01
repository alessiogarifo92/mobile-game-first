import type { StageSpec } from './types';

/**
 * Stage 2. Holds MVP levels 11–15 until the themed stages (#31–#34) take them over.
 * Difficulty bands are the random-tapper win rate (see randomWinRate); frames of another colour
 * are what makes a level hard, because they block every lane until they are painted.
 */
const stage: StageSpec = {
  stage: 2,
  levels: [
    { name: 'butterfly', columns: 3, ammoChunk: 14, slots: 2, beltCapacity: 4, winRate: [0.4, 0.7], seed: 1100, image: [
      'PP......PP',
      'PPP....PPP',
      'PYPP..PPYP',
      'PPPPRRPPPP',
      '.PPPRRPPP.',
      '..OOROOO..',
      '.OOORROOO.',
      'OOYOR.ROYO',
      'OOO......O',
      '.O........',
    ] },
    { name: 'watermelon', columns: 3, ammoChunk: 14, slots: 2, beltCapacity: 4, winRate: [0.5, 0.8], seed: 1200, image: [
      '..........',
      'RRRRRRRRRR',
      'RRBRRRBRRR',
      '.RRRRBRRR.',
      '.RRBRRRRB.',
      '..RRRRRR..',
      '..YYYYYY..',
      '...GGGG...',
      '....GG....',
    ] },
    // 13-15: 12x12, 4 columns, tighter belt,
    { name: 'cat', columns: 4, ammoChunk: 10, slots: 4, beltCapacity: 3, winRate: [0.3, 0.6], seed: 1300, image: [
      'BBBBBBBBBBBB',
      'BOBBBBBBBBOB',
      'BOOBBBBBBOOB',
      'BOOOOOOOOOOB',
      'BOOGOOOOGOOB',
      'BOOGOOOOGOOB',
      'BOOOOPPOOOOB',
      'BYOOOOOOOOYB',
      'BBOOOYYOOOBB',
      'BBBOOOOOOBBB',
      'BBBBBBBBBBBB',
      'GGGGGGGGGGGG',
    ] },
    { name: 'tree', columns: 4, ammoChunk: 10, slots: 2, beltCapacity: 3, winRate: [0.35, 0.65], seed: 1400, image: [
      '....GGGG....',
      '..GGGGGGGG..',
      '.GGGRGGGGGG.',
      'GGGGGGGGRGGG',
      'GGRGGGGGGGGG',
      'GGGGGGRGGGGG',
      '.GGGGGGGGGG.',
      '..GGGGGGGG..',
      '.....OO.....',
      '.....OO.....',
      '.....OO.....',
      'GGGGGOOGGGGG',
    ] },
    { name: 'parrot', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 3, winRate: [0.35, 0.6], seed: 1500, image: [
      '....RRRR....',
      '...RRRRRR...',
      '..RRYBRRRR..',
      '..RRRRRRYY..',
      '..RRRRRRYYY.',
      '...RRRRR.Y..',
      '...GGRRR....',
      '..GGGGRR....',
      '..BGGGGR....',
      '..BBGGGG....',
      '...BBPGG....',
      '.....PP.....',
    ] },
  ],
};

export default stage;
