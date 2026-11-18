import type { StageSpec } from './types';

/**
 * Stage 25 — Musica, quinto stage dell'universo 3 "Viaggio" (#101, ticket #203).
 * Debutto del secchiello coperto (#97): la nota (241) è molto facile e insegna senza punire, con pochi secchielli
 * coperti e nessun lucchetto. Dal 242 ogni livello ha secchielli coperti, chiavi e lucchetti, accanto ai secondari e
 * al marrone già noti; nessun'altra meccanica (niente ghiaccio, pixel nascosti o pietre).
 * Il secchiello coperto non sposta la misura casuale (il dato tiene il colore): la difficoltà viene da chiavi,
 * lucchetti, nastro e slot, e la parte coperta si misura col playtest.
 * Nastro 2 e slot 2 (3 solo al debutto): mai sopra la fine dell'universo 2.
 * winRate = difficulty band for a random tapper (see levelWinRate): belt and slots both weigh in; `special` places
 * keys and locks, and deals the covered buckets.
 */
const stage: StageSpec = {
  stage: 25, key: 'music', color: 'P',
  complete: true,
  levels: [
    { name: 'musicalnote', columns: 3, ammoChunk: 10, slots: 3, beltCapacity: 2, special: { covered: 0.3 }, winRate: [0.95, 1], seed: 25000, image: [
      '...PPPPPPPP.',
      '...PYYYYYYP.',
      '...PP....PP.',
      '...PP....PP.',
      '.BBPP..BBPP.',
      'BBBBP.BBBBP.',
      'BBBB..BBBB..',
      '.BB....BB...',
    ] },
    { name: 'guitar', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.68, 0.76], seed: 25037, image: [
      '....RR.....',
      '....KK.....',
      '....KK.....',
      '....KK.....',
      '...OOOO....',
      '..OOOOOO...',
      '..OOKKOO...',
      '...OOOO....',
      '..OOOOOO...',
      '.OOOOOOOO..',
      '.OOOYYOOO..',
      '..OOOOOO...',
    ] },
    { name: 'drum', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.68, 0.76], seed: 25074, image: [
      'O..........O',
      '.O........O.',
      'KKKKKKKKKKKK',
      '.RRRRRRRRRR.',
      '.RGRGRGRGRG.',
      '.RRRRRRRRRR.',
      'KKKKKKKKKKKK',
      '.Y........Y.',
    ] },
    { name: 'violin', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.35 }, winRate: [0.56, 0.64], seed: 25111, image: [
      '.....RR.....',
      '.....KK.....',
      '.....KK.....',
      '....OOOO....',
      '...OOOOOO...',
      '....OOOO....',
      '...OOKKOO...',
      '..OOOKKOOO..',
      '..OOOKKOOO..',
      '...OOKKOO...',
      '....YYYY....',
    ] },
    { name: 'pianokeys', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.66, 0.74], seed: 25148, image: [
      'RRRRRRRRRRRRRR',
      'KKKKKKKKKKKKKK',
      'KYYKYYYKYYKYYK',
      'KYYKYYYKYYKYYK',
      'KYYKYYYKYYKYYK',
      'KYYYYYYYYYYYYK',
      'KYYYYYYYYYYYYK',
      'KKKKKKKKKKKKKK',
    ] },
    { name: 'trumpet', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.66, 0.74], seed: 25185, image: [
      '..R..R.....OO.',
      '..Y..Y....OOOO',
      'OOOOOOOOOOOOOO',
      'OOOOOOOOOOOOOO',
      '.....OO...OOOO',
      'KKKKK......OO.',
    ] },
    { name: 'headphones', columns: 4, ammoChunk: 5, slots: 2, beltCapacity: 2, special: { key: 2, lock: 3, covered: 0.35 }, winRate: [0.56, 0.64], seed: 25222, image: [
      '...BBBBBB...',
      '..BB....BB..',
      '.BB......BB.',
      '.B........B.',
      '.B........B.',
      'PPP......PPP',
      'PRP......PRP',
      'PRP......PRP',
      'PRP......PRP',
      'PPP......PPP',
    ] },
    { name: 'vinylrecord', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.64, 0.72], seed: 25259, image: [
      '...KKKKK...',
      '..KKKKKKK..',
      '.KKKGGGKKK.',
      'KKKGGYGGKKK',
      'KKKGYYYGKKK',
      'KKKGGYGGKKK',
      '.KKKGGGKKK.',
      '..KKKKKKK..',
      '...KKKKK...',
    ] },
    { name: 'microphone', columns: 4, ammoChunk: 16, slots: 2, beltCapacity: 2, special: { key: 2, lock: 3, covered: 0.4 }, winRate: [0.52, 0.6], seed: 25296, image: [
      '...GGGGG...',
      '..GYGYGYG..',
      '..GGYGYGG..',
      '..GYGYGYG..',
      '...GGGGG...',
      '..PPPPPPP..',
      '...KKKKK...',
      '....KKK....',
      '....KKK....',
      '....KKK....',
      '...BBBBB...',
      '..BBBBBBB..',
    ] },
    { name: 'concert', columns: 4, ammoChunk: 20, slots: 2, beltCapacity: 2, special: { key: 2, lock: 4, covered: 0.4 }, winRate: [0.24, 0.32], seed: 25333, image: [
      'RRRRRRRRRRRRRR',
      'RRPRRPRRPRRPRR',
      'RR..YYYYYY..RR',
      'RR.YYYYYYYY.RR',
      'RR..OOOOOO..RR',
      'RR.OGOGOGOO.RR',
      'RR.OOOOOOOO.RR',
      'RR.KKKKKKKK.RR',
      'RR..K....K..RR',
      'RRR.K....K.RRR',
      'KKKKKKKKKKKKKK',
      'KBBBBBBBBBBBBK',
      'KKKKKKKKKKKKKK',
    ] },
  ],
};

export default stage;
