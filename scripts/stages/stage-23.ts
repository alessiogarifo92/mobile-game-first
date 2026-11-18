import type { StageSpec } from './types';

/**
 * Stage 23 — Mercato, terzo stage dell'universo 3 "Viaggio" (#101, ticket #201).
 * Lucchetto e chiave (#96) si combinano con la pietra (#147): ogni livello ha chiavi, lucchetti e pietre (sulle caselle
 * vuote accanto alla figura) e i secondari e il marrone già noti; nessun'altra meccanica. Nessun debutto, quindi nessun
 * livello molto facile: il respiro (221) resta sotto il 95% e la media sta vicina allo stage 22 (curva verso ~56%).
 * Nastro 2 e slot 2: mai sopra la fine dell'universo 2.
 * winRate = difficulty band for a random tapper (see levelWinRate): belt and slots both weigh in; `special` places
 * keys, locks and stones.
 */
const stage: StageSpec = {
  stage: 23, key: 'market', color: 'Y',
  complete: true,
  levels: [
    { name: 'melonslice', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 2 }, winRate: [0.76, 0.84], seed: 23000, image: [
      '..GGGGGGGGG..',
      '.GYYYYYYYYYG.',
      '.GRRRKRRKRRG.',
      '..GRRRRRRRG..',
      '...GRKRRRG...',
      '....GRRRG....',
      '.....GGG.....',
    ] },
    { name: 'marketbasket', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 3 }, winRate: [0.72, 0.8], seed: 23037, image: [
      '...KKKKKK...',
      '..K......K..',
      '..K..GG..K..',
      '.RRR.OO.YYY.',
      'KKKKKKKKKKKK',
      'KOKOKOKOKOKK',
      'KKKKKKKKKKKK',
      '.KOKOKOKOKK.',
      '..KKKKKKKK..',
    ] },
    { name: 'awning', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 3 }, winRate: [0.7, 0.78], seed: 23074, image: [
      '..RRRRRRRRRR..',
      '.RORORORORORO.',
      'RRRRRRRRRRRRRR',
      '.K..........K.',
      '.K..GGRRYY..K.',
      '.K.KKKKKKKK.K.',
      '.K.KOKOKOKK.K.',
      '.K.K......K.K.',
    ] },
    { name: 'scales', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 3 }, winRate: [0.64, 0.72], seed: 23111, image: [
      '......Y......',
      '.....YOY.....',
      'KKKKKKKKKKKKK',
      'K.....K.....K',
      'K.....K.....K',
      'K.....K.....K',
      'GGGGG.K.PPPPP',
      '.GGG..K..PPP.',
      '......K......',
      '....KKKKK....',
      '...KKKKKKK...',
    ] },
    { name: 'mackerel', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 3 }, winRate: [0.7, 0.78], seed: 23148, image: [
      '....PPPP......',
      '..PPBBBBPP..PP',
      '.PBBBBBBBBPPPP',
      'PBRBBBBBBBBPP.',
      '.PBBBBBBBBPPPP',
      '..PPBBBBPP..PP',
      '....PPPP......',
    ] },
    { name: 'cheese', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 3 }, winRate: [0.69, 0.77], seed: 23185, image: [
      '.........YYYYY',
      '.....YYYYYYYYY',
      '..YYYYYYYYYYYY',
      'YYYYYYYYYYYYOO',
      'OOOOOOOOOOOOOO',
      'OO..OOOOO.OOOO',
      'OOOO.OOOOOO.OO',
      'KKKKKKKKKKKKKK',
    ] },
    { name: 'purse', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 2, lock: 3, stone: 3 }, winRate: [0.64, 0.72], seed: 23222, image: [
      '....KKKKKK....',
      '.....KKKK.....',
      '...KKKKKKKK...',
      '..KKKKYYKKKK..',
      '.KKKKYOOYKKKK.',
      '.KKKKYOOYKKKK.',
      '.KKKKKYYKKKKK.',
      '..KKKKKKKKKK..',
      '.YY.YY..YY.YY.',
      'YOOYOOYYOOYOOY',
    ] },
    { name: 'flowers', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 3 }, winRate: [0.7, 0.78], seed: 23259, image: [
      '..RR....PP....',
      '.RYYR..PYYP...',
      '.RYYR..PYYP...',
      '..RR.GG.PP.RR.',
      '...G.G.G..RYYR',
      '....GG.G..RYYR',
      '.....GGG...RR.',
      '....KKKKKK....',
      '...KBBBBBBK...',
      '....KKKKKK....',
    ] },
    { name: 'cart', columns: 4, ammoChunk: 16, slots: 2, beltCapacity: 2, special: { key: 2, lock: 3, stone: 4 }, winRate: [0.58, 0.66], seed: 23296, image: [
      '.........K....',
      '..RRYYGGOK....',
      '.RRRYYGGOOK...',
      'KKKKKKKKKKK...',
      'KOKOKOKOKOKKKK',
      'KKKKKKKKKKK..K',
      '.KKKKKKKKK...K',
      '..B..KKK..B..K',
      '.BYB.....BYB.K',
      '..B.......B..K',
    ] },
    { name: 'market', columns: 4, ammoChunk: 20, slots: 2, beltCapacity: 2, special: { key: 2, lock: 4, stone: 5 }, winRate: [0.33, 0.41], seed: 23333, image: [
      '..RRRR....OOOO',
      '.ROROROR.OYOYO',
      'RRRRRRRROOOOOO',
      '.K..K..K.K...K',
      '.K..K..K.K...K',
      '.KGGKRRK.KPPPK',
      '.KKKKKKK.KKKKK',
      '.KOKOKOK.KOKOK',
      '.K..K..K.K...K',
      'BBBBBBBBBBBBBB',
      'BKBBBBBKBBBBBK',
      'BBBBBBBBBBBBBB',
    ] },
  ],
};

export default stage;
