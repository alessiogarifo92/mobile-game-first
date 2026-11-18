import type { StageSpec } from './types';

/**
 * Stage 26 — Sport, sesto stage dell'universo 3 "Viaggio" (#101, ticket #204).
 * Secchielli coperti (#97) e marrone (#94) si combinano con chiavi e lucchetti: ogni livello ha secchielli coperti,
 * chiavi e lucchetti, accanto ai secondari e al marrone già noti; nessun'altra meccanica (niente ghiaccio, pixel
 * nascosti o pietre). Nessun debutto, quindi nessun livello molto facile: il respiro (251) resta sotto il 95% e la
 * media scende sotto lo stage 25 (curva verso ~56%). Nastro 2 e slot 2: mai sopra la fine dell'universo 2.
 * winRate = difficulty band for a random tapper (see levelWinRate): belt and slots both weigh in; `special` places
 * keys and locks, and deals the covered buckets.
 */
const stage: StageSpec = {
  stage: 26, key: 'sport', color: 'G',
  complete: true,
  levels: [
    { name: 'soccerball', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.8, 0.88], seed: 26000, image: [
      '...KKKKK...',
      '..KKKKKKK..',
      '.KKKYYYKKK.',
      'KKKYYYYYKKK',
      'KKKYYYYYKKK',
      'KKKYYYYYKKK',
      '.KKKYYYKKK.',
      '..KKKKKKK..',
      '...KKKKK...',
    ] },
    { name: 'basketball', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.68, 0.76], seed: 26037, image: [
      '...OOOOO...',
      '..OOOKOOO..',
      '.OOOOKOOOO.',
      'OOOOOKOOOOO',
      'KKKKKKKKKKK',
      'OOOOOKOOOOO',
      '.OOOOKOOOO.',
      '..OOOKOOO..',
      '...OOOOO...',
    ] },
    { name: 'tennisracket', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.68, 0.76], seed: 26074, image: [
      '...GGGGG...',
      '..GYGYGYG..',
      '.GGYGYGYGG.',
      '.GYGYGYGYG.',
      '.GGYGYGYGG.',
      '..GGGGGGG..',
      '....KKK....',
      '....KKK....',
      '....KKK....',
      '...RRRRR...',
    ] },
    { name: 'trophy', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.35 }, winRate: [0.5, 0.58], seed: 26111, image: [
      'KYYYYYYYYYYYK',
      'OYBYYYYYBYYYO',
      'OYYYRRRRYYYYO',
      '.OYYYRRYYYYO.',
      '..OYYYYYYYO..',
      '...OYYBYYO...',
      '....OYYYO....',
      '.....YYY.....',
      '.....KKK.....',
      '...GGGGGGG...',
      '..GPPPPPPPG..',
    ] },

    { name: 'sneaker', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.64, 0.72], seed: 26148, image: [
      '.........RRR..',
      '........RRRRR.',
      '.......RRRYRRR',
      '......RRRRYYRR',
      '.....ORRRRRYRR',
      '...OOORRRRRRRR',
      '.BBBBBBBBBBBBB',
      'BBBYBBBYBBBYBB',
      'KKKKKKKKKKKKKK',
      'KOKOKOKOKOKOKK',
    ] },


    { name: 'goggles', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.66, 0.74], seed: 26185, image: [
      '......KK...KK.',
      '.....KKKKKKK..',
      '..PPP.KK..PPP.',
      '.PKKKP.KKPKKKP',
      'PK...KP.PK...K',
      'PK...KPPPK...K',
      '.PKKKP...PKKP.',
      '..PPP.....PP..',
    ] },
    { name: 'goalpost', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 2, lock: 3, covered: 0.35 }, winRate: [0.56, 0.64], seed: 26222, image: [
      'YYYYYYYYYYYYYY',
      'YGGGGGGGGGGGGY',
      'YGKGKGKGKGKGKY',
      'YGGKGKGKGKGKGY',
      'YGKGKGKGKGKGKY',
      'YGGGGGGGGGGGGY',
      'YGGGGGGGGGGGGY',
      'GGGGGGGGGGGGGG',
    ] },
    { name: 'swimmer', columns: 4, ammoChunk: 14, slots: 2, beltCapacity: 2, special: { key: 1, lock: 2, covered: 0.3 }, winRate: [0.62, 0.7], seed: 26259, image: [
      '.........OO...',
      '........OOOO..',
      '.......KOOOOK.',
      '....KKKKKKKKK.',
      '.PKKKKKK.PPPP.',
      'PPP.......PPP.',
      'BBBBBBBBBBBBBB',
      'BYBBBYBBBYBBBY',
      'BBBBBBBBBBBBBB',
      'BBYBBBYBBBYBBB',
      '.BBBBBBBBBBBB.',
    ] },

    { name: 'medal', columns: 4, ammoChunk: 16, slots: 2, beltCapacity: 2, special: { key: 2, lock: 3, covered: 0.4 }, winRate: [0.52, 0.6], seed: 26296, image: [
      '.RR......BB.',
      '..RR....BB..',
      '...RR..BB...',
      '....RRBB....',
      '....RRBB....',
      '...YYYYYY...',
      '..YYOOOOYY..',
      '..YOOKKOOY..',
      '..YOOKKOOY..',
      '..YYOOOOYY..',
      '...YYYYYY...',
    ] },
    { name: 'stadium', columns: 4, ammoChunk: 20, slots: 2, beltCapacity: 2, special: { key: 2, lock: 4, covered: 0.4 }, winRate: [0.26, 0.3], seed: 26333, image: [
      'RRRRRRRRRRRRRR',
      'RPRPRPRPRPRPRR',
      'RRRRRRRRRRRRRR',
      'KKKKKKKKKKKKKK',
      'KGGGGGGGGGGGGK',
      'KGGYGGGGGGYGGK',
      'KGGYGGOOGGYGGK',
      'KGGYGOOOOGYGGK',
      'KGGYGGOOGGYGGK',
      'KGGYGGGGGGYGGK',
      'KGGGGGGGGGGGGK',
      'KKKKKKKKKKKKKK',
      'BBBBBBBBBBBBBB',
    ] },
  ],
};

export default stage;
