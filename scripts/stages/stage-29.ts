import type { StageSpec } from './types';

/**
 * Stage 29 — Aeroporto, nono stage dell'universo 3 "Viaggio" (#101, ticket #207).
 * Tutte le meccaniche insieme: ghiaccio, pixel nascosti, marrone, pietre, lucchetti e secchielli coperti (#97). La
 * novità vera è la combinazione completa ice+hidden+brown+stone+lock+covered, mai vista prima; compare dal secondo
 * livello (il respiro, 281, resta alle meccaniche note brown+stone+lock+covered). Nessun debutto, quindi nessun
 * livello molto facile. Il boss (290, il terminal) è il primo con nastro 1 (mai insieme a slot 1); con nastro 1 e slot 2
 * il livello non si vince a caso (~0%), quindi ha 3 slot, come il boss dello stage 20 (mai sopra la fine dell'universo 2); gli
 * altri livelli restano a nastro 2 e slot 2.
 * winRate = difficulty band for a random tapper (see levelWinRate): belt and slots both weigh in; `special` places
 * ice, hidden pixels, keys, locks and stones, and deals the covered buckets.
 */
const stage: StageSpec = {
  stage: 29, key: 'airport', color: 'B',
  complete: true,
  levels: [
    { name: 'carryon', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, stone: 2, covered: 0.3 }, winRate: [0.8, 0.88], seed: 29000, image: [
      '....KKK....',
      '....K.K....',
      '.RRRRRRRRR.',
      '.RYYYYYYYR.',
      '.RYYYYYYYR.',
      '.RYYYKYYYR.',
      '.RYYYYYYYR.',
      '.RRRRRRRRR.',
      '..K.....K..',
    ] },
    { name: 'boardingpass', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.62, 0.68], seed: 29037, image: [
      '.KKKKKKKKK.',
      'KOOOOKYYYYK',
      'KOBBOKYRRYK',
      'KOOOOKYYYYK',
      'KGGGGKPPPPK',
      '.KKKKKKKKK.',
    ] },
    { name: 'windsock', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.6, 0.66], seed: 29074, image: [
      'KKK........',
      'KRROOYYBBB.',
      'KRROOYYBBB.',
      'KRROOYYBB..',
      'K.ROOYYB...',
      'K..........',
      'K..........',
      'K..........',
      'KKK........',
    ] },
    { name: 'tower', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.5, 0.56], seed: 29111, image: [
      '....R....',
      '..GGGGG..',
      '.GBBBBBG.',
      '.GBBBBBG.',
      '..GGGGG..',
      '...OKO...',
      '...OKO...',
      '...OKO...',
      '...OKO...',
      '...OKO...',
      '..OOKOO..',
      '.OOOOOOO.',
    ] },
    { name: 'chopper', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 2, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.6, 0.66], seed: 29148, image: [
      'KKKKKKKKKKKKK',
      '......K......',
      '...OOOOOO....',
      '..OOBBBOOOGGG',
      '.OOOBBBOOOOGG',
      '.OOOOOOOOO...',
      '..OOOOOOO....',
      '..K.....K....',
      '.KKKKKKKKKK..',
    ] },
    { name: 'jetengine', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 3, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.6, 0.66], seed: 29185, image: [
      '...KKKKK...',
      '..KGGGGGK..',
      '.KGGBBBGGK.',
      'KGGBBYBBGGK',
      'KGGBYRYBGGK',
      'KGGBBYBBGGK',
      '.KGGBBBGGK.',
      '..KGGGGGK..',
      '...KKKKK...',
    ] },
    { name: 'propplane', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 2, hidden: 2, key: 2, lock: 3, stone: 3, covered: 0.3 }, winRate: [0.56, 0.62], seed: 29222, image: [
      '......O......',
      '.....RRR.....',
      '.....RBR.....',
      '.....OBO.....',
      'GGGGGOOOGGGGG',
      '.GGGGGOGGGGG.',
      '.....RRR.....',
      '.....OOO.....',
      '....PPOPP....',
      '...PPPOPPP...',
    ] },
    { name: 'hangar', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 3, key: 1, lock: 2, stone: 3, covered: 0.3 }, winRate: [0.54, 0.6], seed: 29259, image: [
      '.....BBB.....',
      '...BBBBBBB...',
      '..BBBBBBBBB..',
      '.BBPPPPPPPBB.',
      'BBBPKKKKKPBBB',
      'BBBPKKKKKPBBB',
      'BBBPKKKKKPBBB',
      'YYYYYYYYYYYYY',
    ] },
    { name: 'jumbojet', columns: 4, ammoChunk: 16, slots: 2, beltCapacity: 2, special: { ice: 3, hidden: 3, key: 2, lock: 3, stone: 4, covered: 0.3 }, winRate: [0.44, 0.5], seed: 29296, image: [
      '..........KK..',
      '.........KKK..',
      '........KKK...',
      'OBOBOBOBOBOBOO',
      'OOOOOOOOOOOOOO',
      '.GGGGGGGGGGOO.',
      '....PPPPPP....',
      '.....K..K.....',
    ] },
    { name: 'terminal', columns: 4, ammoChunk: 24, slots: 3, beltCapacity: 1, special: { ice: 4, hidden: 4, key: 2, lock: 4, stone: 4, covered: 0.3 }, winRate: [0.25, 0.33], seed: 29333, image: [
      '.....RRRR.....',
      '....OOOOOO....',
      '....OBBBBO....',
      '....OOOOOO....',
      '.....KKKK.....',
      '.....KOOK.....',
      'PPPPPPPPPPPPPP',
      'GGBBGGBBGGBBGG',
      'GGBBGGBBGGBBGG',
      'GGGGGGGGGGGGGG',
      'KKKKKKYYKKKKKK',
      'KKKKKKKKKKKKKK',
      'OOOOOOOOOOOOOO',
    ] },
  ],
};

export default stage;
