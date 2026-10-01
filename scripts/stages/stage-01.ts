import type { StageSpec } from './types';

/**
 * Stage 1. Holds levels 1–10 in their original MVP order; ticket #30 rebuilds it around the Atelier theme.
 * Difficulty bands are the random-tapper win rate (see randomWinRate); frames of another colour
 * are what makes a level hard, because they block every lane until they are painted.
 */
const stage: StageSpec = {
  stage: 1,
  levels: [
    { name: 'heart', columns: 2, ammoChunk: 10, slots: 3, beltCapacity: 5, seed: 100, image: [
      '.RR..RR.',
      'RRRRRRRR',
      'RRRRRRRR',
      'RRRRRRRR',
      '.RRRRRR.',
      '..RRRR..',
      '...RR...',
    ] },
    { name: 'sun', columns: 2, ammoChunk: 10, slots: 3, beltCapacity: 5, seed: 200, image: [
      'BBBBBBBB',
      'BBBYYBBB',
      'BBYYYYBB',
      'BYYYYYYB',
      'BYYYYYYB',
      'BBYYYYBB',
      'BBBYYBBB',
      'BBBBBBBB',
    ] },
    { name: 'mushroom', columns: 2, ammoChunk: 14, slots: 3, beltCapacity: 5, winRate: [0.85, 1], seed: 300, image: [
      '..RRRR..',
      '.RYRRYR.',
      'RRRRRRRR',
      'RYRRRRYR',
      '..YYYY..',
      '..YBBY..',
      '..YYYY..',
      '..YYYY..',
    ] },
    // 4-6: first secondaries,
    { name: 'orange', columns: 2, ammoChunk: 10, slots: 2, beltCapacity: 5, winRate: [0.8, 1], seed: 400, image: [
      '...RR...',
      '..OOOO..',
      '.OOYOOO.',
      '.OYOOOO.',
      '.OOOOOO.',
      '.OOOOOO.',
      '..OOOO..',
    ] },
    { name: 'leaf', columns: 2, ammoChunk: 10, slots: 2, beltCapacity: 5, winRate: [0.8, 1], seed: 500, image: [
      '.....GG.',
      '...GGGG.',
      '..GGYGG.',
      '.GGYGGG.',
      '.GYGGG..',
      '.YGGG...',
      'Y.......',
    ] },
    { name: 'pumpkin', columns: 3, ammoChunk: 10, slots: 3, beltCapacity: 5, winRate: [0.75, 0.95], seed: 600, image: [
      '...GG...',
      '..OGOO..',
      '.OOOOOO.',
      'OOYOOYOO',
      'OOOOOOOO',
      'OOYYYYOO',
      '.OOOOOO.',
      '..OOOO..',
    ] },
    // 7-9: purple and every secondary, 3 columns,
    { name: 'grapes', columns: 3, ammoChunk: 10, slots: 2, beltCapacity: 5, winRate: [0.85, 1], seed: 700, image: [
      '....GG..',
      '...GG...',
      '.PP.PP..',
      'PPPPPPP.',
      '.PPPPPP.',
      '..PPPP..',
      '..PPP...',
      '...P....',
    ] },
    { name: 'rainbow', columns: 3, ammoChunk: 10, slots: 2, beltCapacity: 5, winRate: [0.4, 0.7], seed: 800, image: [
      'RRRRRRRR',
      'OOOOOOOO',
      'YYYYYYYY',
      'GGGGGGGG',
      'BBBBBBBB',
      'PPPPPPPP',
    ] },
    { name: 'flower', columns: 3, ammoChunk: 10, slots: 2, beltCapacity: 5, winRate: [0.55, 0.8], seed: 900, image: [
      '..RR.RR.',
      '.RPPRPPR',
      '.RPPPPPR',
      '.ROOOOOR',
      '..ROYOR.',
      '...RGR..',
      '....G...',
      '...GGG..',
    ] },
    // 10-12: 10x10, smaller ammo, fewer slots,
    { name: 'fish', columns: 3, ammoChunk: 10, slots: 4, beltCapacity: 4, winRate: [0.5, 0.85], seed: 1000, image: [
      'BBBBBBBBBB',
      'BBBOOOBBBB',
      'BBOOYOOBOB',
      'BOOBOOOOOB',
      'BOOOOOOOOB',
      'BBOOYOOBOB',
      'BBBOOOBBBB',
      'BBBBBBBBBB',
      'GGBBBBBGGB',
      'GGGGGGGGGG',
    ] },
  ],
};

export default stage;
