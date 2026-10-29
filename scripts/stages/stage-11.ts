import type { StageSpec } from './types';

/**
 * Stage 11 — Bosco, primo stage dell'universo 2 "Natura" (#100).
 * Per ora contiene solo il livello di debutto del marrone (#94): la ghianda, molto facile, insegna senza punire.
 * Nastro 2 come la fine dell'universo 1: il nastro non torna mai più grande.
 * Il resto dello stage arriva con #100.
 * winRate = difficulty band for a random tapper (see levelWinRate): belt and slots both weigh in.
 */
const stage: StageSpec = {
  stage: 11, key: 'forest', color: 'G',
  levels: [
    { name: 'acorn', columns: 3, ammoChunk: 10, slots: 3, beltCapacity: 2, winRate: [0.95, 1], seed: 11000, image: [
      '...KK...',
      '..KKKK..',
      '.KKKKKK.',
      '.OOOOOO.',
      '.OOOOOO.',
      '..OOOO..',
      '...OO...',
    ] },
  ],
};

export default stage;
