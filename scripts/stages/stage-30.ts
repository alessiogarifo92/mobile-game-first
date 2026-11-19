import type { StageSpec } from './types';

/**
 * Stage 30 — Luna park, decimo e ultimo stage dell'universo 3 "Viaggio" (#101, ticket #208).
 * Tutte le meccaniche insieme (ghiaccio, pixel nascosti, marrone, pietre, lucchetti, secchielli coperti): come nello
 * stage 29 la combinazione completa ice+hidden+brown+stone+lock+covered, già comparsa al 282, e nessun debutto, quindi
 * nessun livello molto facile. Il boss (300, la ruota panoramica, 14×14) chiude l'universo: nastro 1 e 3 slot come il
 * terminal (mai sotto il pavimento di slot 2 con nastro 1, mai sopra la fine dell'universo 2); gli altri livelli restano
 * a nastro 2 e slot 2.
 * winRate = difficulty band for a random tapper (see levelWinRate): belt and slots both weigh in; `special` places
 * ice, hidden pixels, keys, locks and stones, and deals the covered buckets.
 */
const stage: StageSpec = {
  stage: 30, key: 'lunapark', color: 'P',
  complete: true,
  levels: [
    { name: 'cottoncandy', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 2, covered: 0.3 }, winRate: [0.78, 0.86], seed: 30000, image: [
      '...PPPPP...',
      '..PPPRRPP..',
      '.PPPRRRRPP.',
      '..PPPPPPP..',
      '...PPPPP...',
      '....OKO....',
      '.....K.....',
      '.....K.....',
    ] },
    { name: 'bumpercars', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.58, 0.66], seed: 30037, image: [
      '......K......',
      '.....KKK.....',
      '.RRRRRRRRRRR.',
      '.RYYRRRRRYYR.',
      '.RRRRBBBRRRR.',
      '.OOOOOOOOOOO.',
      '..KK.....KK..',
    ] },
    { name: 'candyapple', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.56, 0.64], seed: 30074, image: [
      '....G....',
      '...GG....',
      '..OOOOO..',
      '.OOROOOO.',
      '.OROOOOO.',
      '.OOOOOOO.',
      '.OOOOOOO.',
      '..OOOOO..',
      '....K....',
      '....K....',
    ] },
    { name: 'balloondarts', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.46, 0.54], seed: 30111, image: [
      '.OO..GG..PP..',
      'OOOO.GGGG.PPP',
      'OOOO.GGGG.PPP',
      '.OO..GG..PP..',
      '.K....K....K.',
      '.K....K....K.',
      'RRRRYYYYBBBBB',
    ] },
    { name: 'teacups', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.56, 0.64], seed: 30148, image: [
      '.PPPPP.OOOOO.',
      'PPPYPPPOOBOOO',
      '.PPPPP.OOOOO.',
      '..KK.....KK..',
      'KKKKKKKKKKKKK',
      'RRRRRRRRRRRRR',
    ] },
    { name: 'hauntedhouse', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 3, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.56, 0.64], seed: 30185, image: [
      '.....PPP.....',
      '...PPPPPPP...',
      '.PPPPPPPPPPP.',
      '..KKKKKKKKK..',
      '..KYYKKKYYK..',
      '..KYYKKKYYK..',
      '..KKKKGKKKK..',
      '..KKKKGKKKK..',
    ] },
    { name: 'rollercoaster', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 2, lock: 3, stone: 3, covered: 0.3 }, winRate: [0.52, 0.6], seed: 30222, image: [
      '....OOOO..OO..',
      '...OKKKKOOKKO.',
      '..OKYKKYKKYKKO',
      '.OKK.KK..KK.KO',
      'OKK..KK..KK..K',
      'KKKKKKKKKKKKKK',
    ] },
    { name: 'shootinggallery', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 3, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.5, 0.58], seed: 30259, image: [
      'KKKKKKKKKKKKK',
      'K.YY.OO.GG..K',
      'K.YY.OO.GG..K',
      'K.BB.BB.BB..K',
      'KKKKKKKKKKKKK',
      'OOOOOOOOOOOOO',
      '.R.R.R.R.R.R.',
    ] },
    { name: 'pirateship', columns: 4, ammoChunk: 16, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 3, key: 2, lock: 3, stone: 4, covered: 0.3 }, winRate: [0.4, 0.48], seed: 30296, image: [
      '......K......',
      '.....OKP.....',
      '....OOKPP....',
      '...OOOKPPP...',
      '......K......',
      '.KKKKKKKKKKK.',
      '..KKYKKKYKK..',
      '...KKKKKKK...',
      'BBBBBBBBBBBBB',
    ] },
    { name: 'ferriswheel', columns: 4, ammoChunk: 24, slots: 3, beltCapacity: 1, special: { ice: 4, hidden: 4, key: 2, lock: 4, stone: 4, covered: 0.3 }, winRate: [0.25, 0.33], seed: 30333, image: [
      '.....OOOO.....',
      '...OOGGGGOO...',
      '..OGGPPPPGGO..',
      '.OGPPRRRRPPGO.',
      '.OGPRYYYYRPGO.',
      'OGPRYKKKKYRPGO',
      'OGPRYKKKKYRPGO',
      '.OGPRYYYYRPGO.',
      '.OGPPRRRRPPGO.',
      '..OGGPPPPGGO..',
      '...OOGGGGOO...',
      '.....OOOO.....',
      '....K....K....',
      'KKKKKKKKKKKKKK',
    ] },
  ],
};

export default stage;
