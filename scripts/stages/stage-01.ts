import type { StageSpec } from './types';

/**
 * Stage 1 — Atelier (primi colori) (ticket #30).
 * Primari, poi un secondario alla volta (arancione al 4, verde al 5, viola al 7). Livello 1 guidato.
 * Livelli 1–8 tutorial; 9–10 con 2 slot, primo ordine da scegliere (#89).
 * winRate = difficulty band for a random tapper (see levelWinRate): belt and slots both weigh in; `special` places ice/hidden pixels.
 */
const stage: StageSpec = {
  stage: 1,
  complete: true,
  levels: [
    { name: 'heart', columns: 2, ammoChunk: 10, slots: 4, beltCapacity: 5, seed: 1000, image: [
      '.RR..RR.',
      'RRRRRRRR',
      'RRRRRRRR',
      'RRRRRRRR',
      '.RRRRRR.',
      '..RRRR..',
      '...RR...',
    ] },
    { name: 'sun', columns: 2, ammoChunk: 10, slots: 4, beltCapacity: 5, seed: 1037, image: [
      'BBBBBBBB',
      'BBBYYBBB',
      'BBYYYYBB',
      'BYYYYYYB',
      'BYYYYYYB',
      'BBYYYYBB',
      'BBBYYBBB',
      'BBBBBBBB',
    ] },
    { name: 'mushroom', columns: 2, ammoChunk: 10, slots: 4, beltCapacity: 5, seed: 1074, image: [
      '..RRRR..',
      '.RYRRYR.',
      'RRRRRRRR',
      'RYRRRRYR',
      '..YYYY..',
      '..YBBY..',
      '..YYYY..',
      '..YYYY..',
    ] },
    { name: 'flame', columns: 2, ammoChunk: 10, slots: 3, beltCapacity: 5, winRate: [0.5, 1], seed: 1111, image: [
      '...R....',
      '..RR....',
      '..ROR.R.',
      '.ROOORR.',
      '.ROYYOR.',
      'ROYYYYOR',
      'ROYYYYOR',
      '.ROOOOR.',
    ] },
    { name: 'clover', columns: 2, ammoChunk: 10, slots: 3, beltCapacity: 5, winRate: [0.5, 1], seed: 1148, image: [
      '.GG..GG.',
      'GGGGGGGG',
      'GGGGGGGG',
      '.GGYYGG.',
      '.GGYYGG.',
      'GGGGGGGG',
      'GGGGGGGG',
      '.GG..GG.',
    ] },
    { name: 'balloon', columns: 2, ammoChunk: 10, slots: 3, beltCapacity: 5, winRate: [0.5, 1], seed: 1185, image: [
      '..RRRR..',
      '.RRRRRR.',
      '.RYRRRR.',
      '.RRRRRR.',
      '..RRRR..',
      '...RR...',
      '....Y...',
      '...Y....',
    ] },
    { name: 'gem', columns: 2, ammoChunk: 10, slots: 3, beltCapacity: 5, winRate: [0.4, 1], seed: 1222, image: [
      '..PPPP..',
      '.PBPPBP.',
      'PPPPPPPP',
      'RPPPPPPR',
      '.RPPPPR.',
      '..RPPR..',
      '...RR...',
    ] },
    { name: 'rainbow', columns: 2, ammoChunk: 10, slots: 3, beltCapacity: 5, winRate: [0.4, 1], seed: 1259, image: [
      'RRRRRRRR',
      'OOOOOOOO',
      'YYYYYYYY',
      'GGGGGGGG',
      'BBBBBBBB',
      'PPPPPPPP',
    ] },
    { name: 'crayons', columns: 2, ammoChunk: 10, slots: 2, beltCapacity: 5, winRate: [0.85, 0.93], seed: 1296, image: [
      'R.O.Y.G.',
      'RROOYYGG',
      'RROOYYGG',
      'RROOYYGG',
      'RROOYYGG',
      'RROOYYGG',
      'BBBBBBBB',
      'BBBBBBBB',
    ] },
    { name: 'palette', columns: 3, ammoChunk: 10, slots: 2, beltCapacity: 5, winRate: [0.74, 0.84], seed: 1333, image: [
      '..OOOOOO..',
      '.OOOOOOOO.',
      'OORROOYYOO',
      'OORROOYYOO',
      'OOOOOOOOOO',
      'OOBBOO..OO',
      'OOBBOO..OO',
      'OOOOOOOOO.',
      '.OOGGOOPP.',
      '..OOOOOO..',
    ] },
  ],
};

export default stage;
