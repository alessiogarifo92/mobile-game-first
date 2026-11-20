# Changelog

## Non rilasciato

### Card "Perché è tornato" e "Corsia bloccata" anticipate, suggerimenti degli ingorghi più chiari (#225, epic #66)

- **Le due card arrivano all'inizio del primo livello in cui il caso può succedere**, non dopo il primo ingorgo (T20: 3 agent su 3 vedevano "Perché è tornato" solo dopo averlo subito, ai livelli 246, 287 e 298). `levelCases` (`src/core/leftover.ts`) prevede su ogni secchiello della tela intatta se può tornare con vernice avanzata o restare senza tiri; `tipsAnticipated` (`src/core/onboarding.ts`) le mette dopo le card delle meccaniche nuove, una per livello, e solo dopo la card degli slot (il livello 2 la mostra al primo ritorno e resta a una sola card). Le card già viste restano viste: nessuna migrazione dei salvataggi.
- **Suggerimenti `escape.*` più chiari** (IT + EN, sempre su una riga): "Lancia prima uno senza ↩: si svuota", "Tutti tornerebbero: …" al posto di "Nessun lancio sicuro"; la card "Perché è tornato" dice anche che senza ↩ il secchiello si svuota.
- **Salvataggi dei playtest** (`scripts/playtest/saves.ts`): le due card nuove restano non viste per i livelli del pacchetto pianificato, come le altre.
- **Pietre che bloccano un tiro (punto 3 del ticket)**: non fatto, serve una decisione di design (nessun nuovo asset) ed era solo un'ipotesi; resta una nota nella PR.
- Test: unit (`tests/onboarding.test.ts`, `tests/leftover.test.ts`: prima occorrenza, ordine, casi limite, salvataggi vecchi; `tests/playtest.test.ts` aggiornato; i18n già coperto dal confronto delle chiavi IT/EN); e2e `e2e/anticipa-card-225.spec.ts`; screenshot 360×640 e 412×915 in `docs/test-evidence/225-anticipa-card/`.

### Playtest agent dell'universo 3 (#68, #101, epic #66)

- **Report del turno T20** in `docs/reports/2026-11-19-playtest-agent-universo-3.md` (3 agent, livelli 241–250, 281–289, 291–300): 29 livelli vinti, 28 al 1° tentativo, 0 bug; confermata da 3 agent su 3 la card "Perché è tornato" troppo tardiva (ticket #225), il resto sono ipotesi. Le tre schede JSON sono in `docs/playtest/sessioni/T20/` (senza screenshot).

### Stage 30 "Luna park": livelli 291–300, ultimo stage dell'universo 3 (#208, #101)

- **Dieci figure in pixel art originale** sul luna park (`scripts/stages/stage-30.ts`): zucchero filato, autoscontro, mela caramellata, palloncini e freccette, tazze rotanti, casa degli spettri, montagne russe, tiro a segno, nave dei pirati e il boss, la ruota panoramica (14×14, 136 pixel: la figura più grande dello stage). Foglio di anteprima in `docs/levels/stage-30.png`; nomi IT/EN.
- **Tutte le meccaniche insieme**: dal 292 ogni livello ha ghiaccio, pixel nascosti, chiavi e lucchetti, pietre e secchielli coperti, con il marrone in ogni disegno; la combinazione completa ice+hidden+brown+stone+lock+covered è comparsa al 282 (stage 29) e riempie anche la finestra di novità 281–300, quindi qui non c'è un debutto e nessun livello è molto facile. Il respiro (291) resta su brown+stone+lock+covered. ≥ 30% di pixel secondari o marroni dal 292.
- **Boss finale con nastro 1 e 3 slot** (300): come il terminal, mai sopra la fine dell'universo 2 (slot ≤ 3, nastro ≤ 2); gli altri livelli restano a nastro 2 e slot 2.
- **Curva** a dente di sega (#88): vittorie a caso 83,5 · 63 · 60 · 53,5 · 61 · 62,5 · 52 · 56 · 40 · 26,5%, media 55,8% (obiettivo di fine universo ~56%; stage 29: 58,7%), boss più duro 26,5% (≥ 25%). Ogni livello è dimostrato risolvibile dal solver.
- **Report della curva dell'universo 3** in `docs/reports/2026-11-19-curva-universo-3.md` (livelli 201–300; rigenerati `curva-difficolta.json` e `.png`): primo stage 74%, ultimo 56%, boss più duro 25%, nessun avviso nuovo; con la proposta (non eseguita) del playtest agent sull'universo 3.
- Test: unit sullo stage (`tests/stage30.test.ts`: nomi IT/EN, 291–300, tela ≤ 14×14, boss la figura più grande, chiavi, lucchetti, pietre e coperti, combinazione completa e finestra di novità, ≥ 30% secondari, nastro 1 solo sul boss, curva, media); e2e `e2e/stage-30.spec.ts`: la mappa dell'universo 3 mostra lo stage 30 dopo il 290, il 291 e il 292 si giocano fino alla vittoria.

### Stage 29 "Aeroporto": livelli 281–290 (#207, #101)

- **Dieci figure in pixel art originale** sull'aeroporto (`scripts/stages/stage-29.ts`): bagaglio a mano, carta d'imbarco, manica a vento, torre di controllo, elicottero, turbina, aereo a elica, hangar, jumbo jet e il boss, il terminal (14×13). Foglio di anteprima in `docs/levels/stage-29.png`; nomi IT/EN.
- **Tutte le meccaniche insieme**: dal 282 ogni livello ha ghiaccio, pixel nascosti, chiavi e lucchetti, pietre e secchielli coperti, con il marrone nel disegno (tranne l'aereo a elica); è la combinazione nuova ice+hidden+brown+stone+lock+covered, mai vista prima. Il respiro (281) resta su brown+stone+lock+covered. Nessun debutto, quindi nessun livello molto facile. ≥ 30% di pixel secondari o marroni dal 282.
- **Primo boss con nastro 1** (290, mai insieme a slot 1): con nastro 1 e slot 2 il terminal si vinceva a caso circa 0%, quindi ha 3 slot, come il boss dello stage 20 (mai sopra la fine dell'universo 2). Gli altri livelli restano a nastro 2 e slot 2.
- **Curva** a dente di sega (#88): vittorie a caso 80,5 · 67 · 64 · 54 · 63,5 · 65,5 · 60 · 58 · 45,5 · 28,5%, media 58,7% (stage 28: 59,4%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (`tests/stage29.test.ts`: nomi IT/EN, 281–290, tela ≤ 14×14, chiavi, lucchetti, pietre e coperti, combinazione completa dal 282 e finestra di novità, ≥ 30% secondari, nastro 1 solo sul boss, curva, media); e2e `e2e/stage-29.spec.ts`: la mappa dell'universo 3 mostra lo stage 29 dopo il 280, il 281 e il 282 si giocano fino alla vittoria.

### Stage 28 "Monumenti": livelli 271–280 (#206, #101)

- **Dieci figure in pixel art originale** sui monumenti (`scripts/stages/stage-28.ts`): piramide di Giza, obelisco, torre pendente, moai, Stonehenge, Big Ben, Statua della Libertà, Torre Eiffel, Taj Mahal e il boss, il Colosseo (14×11). Foglio di anteprima in `docs/levels/stage-28.png`; nomi IT/EN.
- **Lucchetto, pietra e marrone insieme**: ogni livello ha chiavi, lucchetti, pietre accanto alla figura e marrone nel disegno; niente ghiaccio né pixel nascosti. Stonehenge (275) aggiunge i secchielli coperti: la combinazione nuova che la finestra di novità 261–280 (#157) richiede, perché brown+stone+lock esiste già dal 221. Nessun debutto, quindi nessun livello molto facile. ≥ 30% di pixel secondari o marroni dal 272.
- **Nastro 2, slot 2**: mai sopra la fine dell'universo 2.
- **Curva** a dente di sega (#88): vittorie a caso 80,5 · 65,5 · 65 · 57 · 62,5 · 66,5 · 56 · 62,5 · 54 · 25%, media 59,4% (stage 27: 60,8%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (`tests/stage28.test.ts`: nomi IT/EN, 271–280, tela ≤ 14×14, chiavi, lucchetti e pietre, marrone, secchielli coperti solo al 275 e finestra di novità, ≥ 30% secondari, nastro e slot, curva, media); e2e `e2e/stage-28.spec.ts`: la mappa dell'universo 3 mostra lo stage 28 dopo il 270, il 271 e il 272 si giocano fino alla vittoria.

### Stage 27 "Circo": livelli 261–270 (#205, #101)

- **Dieci figure in pixel art originale** sul circo (`scripts/stages/stage-27.ts`): palloncino, cappello da clown, popcorn, biglietto, cannone, cilindro magico, trapezio, leone, clown e il boss, il tendone (13×14). Foglio di anteprima in `docs/levels/stage-27.png`; nomi IT/EN.
- **Lucchetto e secchiello coperto insieme**: ogni livello ha secchielli coperti (30–40%), chiavi e lucchetti, accanto ai secondari; nessun'altra meccanica (niente ghiaccio, pixel nascosti o pietre). Nessun debutto, quindi nessun livello molto facile. ≥ 30% di pixel secondari o marroni dal 262.
- **Nastro 2, slot 2**: mai sopra la fine dell'universo 2.
- **Curva** a dente di sega (#88): vittorie a caso 92 · 64 · 63 · 54 · 70 · 70 · 53 · 62 · 56 · 25,5%, media 60,8% (stage 26: 63,4%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (`tests/stage27.test.ts`: nomi IT/EN, 261–270, tela ≤ 14×14, secchielli coperti, chiavi e lucchetti, ≥ 30% secondari, nastro e slot, curva, media); e2e `e2e/stage-27.spec.ts`: la mappa dell'universo 3 mostra lo stage 27 dopo il 260, il 261 e il 262 si giocano fino alla vittoria.

### Difficoltà di ogni livello e stage, calcolata in core (#72, epic #70)

- **Una sola definizione** in `src/core/difficulty.ts` (pura, niente Phaser/DOM): tabella `DIFFICULTY` con `version` 1 e le soglie congelate del research #71 (Facile ≥ 85%, Normale ≥ 65% e < 85%, Difficile < 65% sul win rate casuale); `levelDifficulty(winRate, level)` → `{ band, boss, veryEasy }` (il boss è un flag, non una fascia; `veryEasy` = `CURVE.veryEasy`, interno); `stageDifficulty(levels)` = media dei win rate dei 10 livelli, `undefined` se lo stage non è completo. Nessuna seconda formula: nastro e slot pesano già nel win rate (#75).
- **Persistenza in un file affiancato** `src/levels/difficulty.json` (versione della tabella + per livello `specHash`, `winRate`, fascia), non in `levels.json`: le PR degli stage non vanno in conflitto. `npm run gen:levels` misura il win rate solo dei livelli il cui spec è cambiato (incrementale) e ricalcola le fasce; un livello nuovo riceve l'etichetta senza toccare gli altri. `--check` fallisce se il file manca, ha un'altra versione della tabella, una fascia diversa da quella ricalcolata o non copre esattamente i livelli di `levels.json`; in tal caso stampa la tabella dei livelli che cambiano fascia. **I win rate dei livelli esistenti non cambiano** (`levels.json` identico).
- **CI**: errore se la fascia calcolata contraddice quella dichiarata in `curve.difficulty: { band, why }` nella spec (accanto a `easyBoss`) o se manca il motivo; solo informative: livelli entro 3 punti da una soglia (67 oggi), fasce `winRate` di spec che attraversano una soglia (91) e stage il cui boss ha più nastro o slot dei livelli 2–9 (stage 20).
- **Report**: `scripts/difficulty-report.ts` stampa per stage quanti livelli Facile/Normale/Difficile, la fascia del boss e il valore dello stage, e aggiunge `band` a `docs/reports/curva-difficolta.json`, tutto dalla stessa funzione.
- Test (`tests/difficulty.test.ts`, soglia di coverage 100% per `difficulty.ts` in `vitest.config.ts`): boundary esatti 0,85 / 0,65, un livello più duro aggiunto non cambia le etichette dei vecchi, monotonia di nastro e slot sul win rate misurato, una leva sola cambia la fascia, stage incompleto, versione nel file salvato, win rate salvato = `levelWinRate`, determinismo. Fuori ambito: UI (#73).

### Stage 26 "Sport": livelli 251–260 (#204, #101)

- **Dieci figure in pixel art originale** sullo sport (`scripts/stages/stage-26.ts`): pallone da calcio, pallone da basket, racchetta, trofeo, scarpa da corsa, occhialini da nuoto, porta, nuotatore, medaglia e il boss, lo stadio (14×13). Foglio di anteprima in `docs/levels/stage-26.png`; nomi IT/EN.
- **Secchielli coperti e marrone insieme**, con chiavi e lucchetti: ogni livello ha secchielli coperti (30–40%), chiavi, lucchetti e pixel marroni, accanto ai secondari; nessun'altra meccanica (niente ghiaccio, pixel nascosti o pietre). Nessun debutto, quindi nessun livello molto facile. ≥ 30% di pixel secondari o marroni dal 252.
- **`covered` tra le meccaniche del report della curva** (`MECHANICS` in `src/core/curveReport.ts`): con 260 livelli la finestra 241–260 è completa e il test "una novità ogni 20 livelli" (#157) la segnalava vuota; il debutto del secchiello coperto (241) ora conta come novità.
- **Nastro 2, slot 2**: mai sopra la fine dell'universo 2.
- **Curva** a dente di sega (#88): vittorie a caso 85 · 69 · 72 · 57 · 70 · 70 · 58 · 69 · 59 · 27%, media 63,4% (stage 25: 65,3%); il boss è il più duro dello stage, più duro del 250 (28%) e sopra il pavimento dell'universo (25%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (`tests/stage26.test.ts`: nomi IT/EN, 251–260, tela ≤ 14×14, secchielli coperti, chiavi, lucchetti e marrone, ≥ 30% secondari, nastro e slot, curva, media); e2e `e2e/stage-26.spec.ts`: la mappa dell'universo 3 mostra lo stage 26 dopo il 250, il 251 e il 252 si giocano fino alla vittoria.

### Stage 25 "Musica": livelli 241–250, debutto del secchiello coperto (#203, #101)

- **Dieci figure in pixel art originale** sulla musica (`scripts/stages/stage-25.ts`): nota, chitarra, tamburo, violino, tasti del pianoforte, tromba, cuffie, disco in vinile, microfono e il boss, il concerto con il suo palco (14×13). Foglio di anteprima in `docs/levels/stage-25.png`; nomi IT/EN.
- **Debutto del secchiello coperto** (#97): la nota (241) è molto facile (≥ 95% a caso), ha qualche secchiello coperto e nessun lucchetto, e mostra la scheda "Secchielli coperti". Dal 242 ogni livello ha secchielli coperti (30–40% dei secchielli), chiavi e lucchetti, accanto ai secondari e al marrone già noti; niente ghiaccio, pixel nascosti o pietre. Il secchiello coperto non cambia la misura casuale (il dato tiene il colore): la parte coperta si misura col playtest. Dal 242 ≥ 30% di pixel secondari o marroni.
- **Regola 1 della curva**: `covered` conta tra le meccaniche che la regola 1 riconosce come debutto (`src/core/curve.ts`).
- **Nastro 2, slot 2** (3 slot solo al debutto): mai sopra la fine dell'universo 2.
- **Curva** a dente di sega (#88): vittorie a caso 100 · 74 · 76 · 58 · 67 · 69 · 59 · 66 · 57 · 28%, media 65,3% (stage 24: 66,4%); il boss è il più duro dello stage, più duro del 240 (31%) e sopra il pavimento dell'universo (25%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (`tests/stage25.test.ts`: nomi IT/EN, 241–250, tela ≤ 14×14, secchielli coperti dal 241 con la scheda, chiavi e lucchetti dal 242, nessun'altra meccanica, ≥ 30% secondari, nastro e slot, curva, media); e2e `e2e/stage-25.spec.ts`: la mappa dell'universo 3 mostra lo stage 25 dopo il 240, il 241 spiega i secchielli coperti e si gioca fino alla vittoria, il 242 con chiave e lucchetti pure.

### Report della curva di difficoltà aggiornato ai 240 livelli (#215)

- **`docs/reports/curva-difficolta.{json,png}` rigenerati** (240 livelli, universi 1–3, stage 24 compreso): prima fermi ai 200 livelli di #173. Sui livelli già presenti cambiano solo 141, 164, 175 e 195, tutti per le pietre che bloccano la vernice (#147, PR #189).
- **Test di allineamento** `tests/difficultyReport.test.ts`: fallisce solo se il report ha livelli che non esistono più in `levels.json`; per i livelli mancanti emette solo un warning con il comando di rigenerazione (nessun blocco per le PR degli stage; logica pura in `src/core/reportAlignment.ts`). Il report resta uno script manuale, non un passo della CI.

### Stage 24 "Festa": livelli 231–240, lucchetto e chiave con ghiaccio e nascosti (#202, #101)

- **Dieci figure in pixel art originale** sulla festa (`scripts/stages/stage-24.ts`): palloncini, cappellino, pacco regalo, torta di compleanno, lanterna di carta, coppa di gelato, festoni, piñata, giostra e il boss, la festa con le sue bandierine (14×12). Foglio di anteprima in `docs/levels/stage-24.png`; nomi IT/EN.
- **Lucchetto e chiave si combinano con ghiaccio e pixel nascosti** (nessun debutto, niente pietre): ogni livello ha chiavi, lucchetti, pixel ghiacciati e nascosti (1 chiave e 2 lucchetti; 2 e 3 nei festoni e nella giostra; 2 e 4 nel boss), accanto ai secondari e al marrone già noti. Dal 232 ≥ 30% di pixel secondari o marroni.
- **Nastro 2, slot 2**: mai sopra la fine dell'universo 2.
- **Curva** a dente di sega (#88), senza livelli molto facili: vittorie a caso 87 · 72 · 72 · 64 · 73 · 72 · 64 · 70 · 61 · 31%, media 66,4% (stage 23: 68,9%); il boss è il più duro dello stage e più duro del 230 (36%), sopra il pavimento dell'universo (25%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (`tests/stage24.test.ts`: nomi IT/EN, 231–240, tela ≤ 14×14, chiavi/lucchetti/ghiaccio/nascosti ovunque, ≥ 30% secondari, nastro e slot, curva, media); e2e `e2e/stage-24.spec.ts`: la mappa dell'universo 3 mostra lo stage 24 dopo il 230 e il 231 si gioca fino alla vittoria.

### Spiegare in gioco cosa comporta ogni aumento di difficoltà (#77)

- **Una striscia sotto il titolo dice cosa è cambiato e cosa comporta** quando un livello fa un passo avanti: nastro con meno capienza ("Nastro: max 3 secchielli"), meno slot, tela più grande, più colonne, secchielli più piccoli, boss. Icona (forma, non colore), il fatto in grassetto e una riga su cosa comporta; non copre il nastro, gli slot né le colonne (a 360×640 sta sopra il nastro) e si chiude con un tocco o al primo lancio. Direzione A di `docs/design/77-novita-difficolta.md`, scelta su tre.
- **Una volta sola per novità**, salvata tra i suggerimenti (`chg.<tipo>`; nastro e slot per valore a cui scendono): i salvataggi vecchi funzionano senza migrazione. Nastro e slot che calano insieme sono **una sola** striscia; al massimo una per livello. Con tutto il gioco sono 9 strisce.
- **Già coperto prima, non toccato**: ghiaccio, nascosti, pietra, marrone, lucchetto, coperti, slot al ritorno, nastro pieno e "+N" hanno già la loro scheda (#177) e la pagina in "Come si gioca" (#183). Nuova pagina "Quando si fa più duro" che elenca le novità incontrate.
- Calcolo puro in `src/core/levelChanges.ts` (soglie in `CHANGE_RULES`, testi `change.*` in IT/EN, nessun numero nel codice di gioco); `npm run changes:levels` e `scripts/difficulty-report.ts` elencano i cambi di ogni livello. Cosa comporta ogni cambio: `docs/strategia-progetto.md`.
- Test: unit (`tests/levelChanges.test.ts`: nessun cambio, uno, più cambi, primo livello, inizio stage, id salvati, testi; `tests/howto.test.ts`); e2e `e2e/novita-77.spec.ts` a 360×640 e 412×915: la striscia compare al livello giusto, una volta, non copre la partita (`checkOnScreen`), si chiude con un tocco e al primo lancio.

### Stage 23 "Mercato": livelli 221–230, lucchetto e chiave con la pietra (#201, #101)

- **Dieci figure in pixel art originale** sul mercato (`scripts/stages/stage-23.ts`): fetta di anguria, cesto della spesa, tendone, bilancia, sgombro, formaggio, borsellino, fiori, carretto e il boss, il mercato con le sue bancarelle (14×12). Foglio di anteprima in `docs/levels/stage-23.png`; nomi IT/EN.
- **Lucchetto e chiave si combinano con la pietra** (nessun debutto): ogni livello ha chiavi, lucchetti e pietre sulle caselle vuote accanto alla figura (1 chiave e 2 lucchetti; 2 e 3 nel borsellino e nel carretto; 2 e 4 nel boss), accanto ai secondari e al marrone già noti; nessun'altra meccanica. Dal 222 ≥ 30% di pixel secondari o marroni.
- **Nastro 2, slot 2**: mai sopra la fine dell'universo 2.
- **Curva** a dente di sega (#88), senza livelli molto facili: vittorie a caso 78 · 76 · 76 · 71 · 78 · 76 · 68 · 74 · 59 · 36%, media 69,2% (stage 22: 68,8%); il boss è il più duro dello stage, sopra il pavimento dell'universo (25%). Ogni livello è dimostrato risolvibile dal solver.
- **Test più robusti**: `e2e/stage-21.spec.ts` e `e2e/stage-22.spec.ts` non elencano più tutti gli stage e i nodi della mappa dell'universo 3 (controllano le prime intestazioni e i nodi del proprio stage), quindi non si rompono a ogni stage nuovo.
- Test: unit sullo stage (`tests/stage23.test.ts`: nomi IT/EN, 221–230, tela ≤ 14×14, chiavi, lucchetti e pietre ovunque, ≥ 30% secondari, nastro e slot, curva, media); e2e `e2e/stage-23.spec.ts`: la mappa dell'universo 3 mostra lo stage 23 dopo il 220 e il 221 si gioca fino alla vittoria.

### Stage 22 "Porto": livelli 211–220, lucchetto e chiave con il marrone (#200, #101)

- **Dieci figure in pixel art originale** sul porto (`scripts/stages/stage-22.ts`): ancora, salvagente, peschereccio, cassa del carico, gru del porto, botte, molo, nave da carico, rimorchiatore e il boss, il porto con faro e veliero (14×14). Foglio di anteprima in `docs/levels/stage-22.png`; nomi IT/EN.
- **Lucchetto e chiave si combinano con il marrone** (nessun debutto): ogni livello ha chiavi e lucchetti (1 chiave e 2 lucchetti; 2 e 3 nel molo e nel rimorchiatore; 2 e 4 nel boss) accanto a scafi, casse e botti marroni e ai secondari già noti, nessun'altra meccanica. Dal 212 ≥ 30% di pixel secondari o marroni.
- **Nastro 2, slot 2**: mai sopra la fine dell'universo 2.
- **Curva** a dente di sega (#88), un po' più dura della Stazione e senza livelli molto facili: vittorie a caso 83 · 77 · 75 · 70 · 78 · 70 · 67 · 71 · 60 · 37%, media 68,5% (stage 21: 74,4%); il boss è il più duro dello stage, sopra il pavimento dell'universo (25%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (`tests/stage22.test.ts`: nomi IT/EN, 211–220, tela ≤ 14×14, chiavi e lucchetti ovunque, marrone e ≥ 30% secondari, nastro e slot, curva, media); e2e `e2e/stage-22.spec.ts`: la mappa dell'universo 3 aggiunge lo stage 22 dopo il 210 e il 211 si gioca fino alla vittoria.

### Universo 3 "Viaggio" e stage 21 "Stazione": livelli 201–210, debutto di lucchetto e chiave (#199, #101)

- **Nasce l'universo 3 "Viaggio"** (IT/EN, tema blu, tela fino a 14×14): si apre completando il livello 200, l'ultimo dell'universo 2, e la mappa e l'album lo mostrano come gli altri. Per ora ha solo lo stage 21 (completo): gli altri arrivano con #101.
- **Dieci figure in pixel art originale** sulla stazione (`scripts/stages/stage-21.ts`): biglietto, valigia, orologio della stazione, semaforo, panchina del binario, edicola, locomotiva, lanterna di stazione, galleria e il boss, la stazione centrale (14×14). Foglio di anteprima in `docs/levels/stage-21.png`; nomi IT/EN.
- **Il 201 è il debutto di lucchetto e chiave** (#96): molto facile (vittorie a caso 100%), una chiave sul bordo e due lucchetti in mezzo al biglietto; il suggerimento compare una volta. Dal 202 ogni livello ha chiavi e lucchetti (1 chiave e 2 lucchetti; 2 e 3 nella locomotiva e nella galleria; 2 e 4 nel boss) accanto al marrone e ai secondari già noti, nessun'altra meccanica.
- **Nastro 2, slot 2** (3 solo al 201): mai sopra la fine dell'universo 2. Dal 202 ≥ 30% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): vittorie a caso 100 · 80 · 81 · 78 · 78 · 77 · 72 · 76 · 63 · 41%, media 74,4% (più facile della fine dell'universo 2, 61,4%); il boss è il più duro dello stage, sopra il pavimento dell'universo (25%). Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sull'universo 3, sullo stage e sullo sblocco dopo il 200 (`tests/stage21.test.ts`); e2e `e2e/stage-21.spec.ts`: la mappa si apre sull'universo 3 dopo il 200 e il 201 si gioca fino alla vittoria con la scheda del lucchetto. Il fixture `covered-debut` (`vite.config.ts`) non aggiunge più un universo di troppo ora che lo stage 21 esiste.

### Fine stage: il nuovo stile si vede e si usa subito (#153)

- **Il pannello vittoria di fine stage mostra lo stile sbloccato** su tre barattoli (rosso, giallo, blu) in una scheda col bordo oro, con **Usalo subito** che lo mette sui secchielli (il bottone diventa "✓ In uso"); il bottone Album e il rimando "Tocca Album per vedere tutti gli stili" restano. Prima il pannello annunciava lo stile senza mostrarlo né applicarlo (playtest agent, F9: "non ho visto nessun cambio"). Direzione A di `docs/design/153-ricompensa-stage.md`, scelta su tre.
- Il pannello si allunga (760 → 940) solo quando c'è un premio, e il quadro si rimpicciolisce; sta nello schermo a 360×640 e 412×915 in IT e EN.
- Uno stile si applica solo se è stato guadagnato (`useSkin`, usato anche dall'album).
- Test: unit su `stageReward`, `useSkin` e il layout del pannello (`src/core/winPanel.ts`); e2e `e2e/reward-153.spec.ts`: anteprima, "Usalo subito" applica lo stile (salvato e visibile al livello 11), il bottone Album porta alla pagina dello stage, nessuna scheda su un livello che non chiude uno stage.

### Pixel "?": la rivelazione si vede (#152)

- **La copertura si gira come una carta** (direzione A "Tessera girata", `docs/design/152-rivelazione.md`): il "?" si stringe e sparisce, la faccia si apre piena del colore scoperto con un bordo d'inchiostro, poi sfuma nel pixel da dipingere (700 ms, con il suono della rivelazione). Prima il pixel diventava di colpo un pixel vuoto e un lampo bianco di 300 ms si perdeva nello schizzo del colpo (playtest agent, F8: "non l'ho mai visto diventare un colore"). Il pixel resta coperto finché la goccia non arriva sul vicino.
- **Movimento ridotto**: niente rotazione; colore pieno e bordo restano fermi per 1,2 s, poi un taglio netto.
- Test: unit sui fotogrammi (`src/core/reveal.ts`); e2e `e2e/reveal-152.spec.ts` sul livello 51, con e senza `prefers-reduced-motion`.

### Universo 1: la pietra debutta nei livelli 81–100 (#157, epic #87)

- **Novità nella finestra 81–100**, l'unica del gioco che ne era priva: la **pietra** (già nel gioco dal 141) debutta al livello 81, la stella, con due pietre disegnate a mano tra i pixel di una riga (un colpo si ferma per forza); il suggerimento compare una volta. La riprendono 85 (ufo) e 88 (alieno) con pietre messe dal generatore. Ghiaccio e nascosti restano come prima: il 81 è la combinazione nuova ghiaccio + nascosti + pietra.
- **Il 141 non è più il debutto**: la papaia (slot 3 → 2, vittorie a caso 100% → 91%) è ora un normale primo livello dell'universo 2, fuori dalla regola "molto facile solo se debutto". Id, nomi e numero dei livelli non cambiano, quindi i progressi restano validi; cambiano solo 81, 85, 88 e 141.
- **Curva** non peggiorata: stage 9 da 63,9% a 64,5% (l'85 passa da 57,5% a 62%, l'88 da 62,5% a 60,5%), stage 10 invariato (65%), stage 15 da 73% a 72%. Il controllo "una novità ogni 20 livelli" passa su tutto il gioco (finestre vuote dal 21: nessuna).
- Test: la pietra debutta al 81 (primo livello con pietre, suggerimento, pietre tra due pixel di una riga, solo 81/85/88 prima del 101), nessuna finestra di 20 livelli senza novità sul gioco vero; l'e2e del debutto passa dal 141 all'81 (`e2e/stone-debut.spec.ts`). `preview:levels` accetta `CHROMIUM_PATH` come `difficulty-report`.

### Stage 20 "Vulcano": livelli 191–200, fine dell'universo 2 (#130)

- **Dieci figure in pixel art originale** sul vulcano (`scripts/stages/stage-20.ts`): goccia di lava, ossidiana, geyser, salamandra pezzata, roccia lavica, cristalli di zolfo, fenice, sorgente termale, colata di lava e il boss, l'eruzione (14×14). Foglio di anteprima in `docs/levels/stage-20.png`; nomi IT/EN.
- **Tutte le meccaniche dell'universo** in ogni livello, nessuna novità: marrone, pietra, ghiaccio e nascosti; nastro 2 e slot 2 in tutto lo stage. Roccia viola con venature marroni, lava in rosso e arancio; dalla seconda figura in poi ≥ 51% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): vittorie a caso 82 · 64,5 · 69 · 61,5 · 67,5 · 64 · 56 · 65 · 51 · 33,5%, media 61,4% (sotto l'inverno, 64,7%, e la notte nel bosco, 62,8%; sul ~62% di fine universo); nessun livello molto facile, il boss è il più duro dello stage e dell'universo 2. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva, boss più duro dell'universo); e2e: il livello 191 si gioca fino alla vittoria.

### Stage 19 "Notte nel bosco": livelli 181–190 (#129)

- **Dieci figure in pixel art originale** sulla notte nel bosco (`scripts/stages/stage-19.ts`): lucciola, pipistrello, falena, procione, fuoco da campo, tenda, lupo che ulula, ghiro, gufo reale e il boss, la casa sull'albero (14×14). Foglio di anteprima in `docs/levels/stage-19.png`; nomi IT/EN.
- **Combinazione nuova: marrone + pietra + nascosti** in ogni livello, senza ghiaccio; nastro 2 e slot 2 in tutto lo stage. Creature in viola e marrone, luna e luci in giallo; dalla seconda figura in poi ≥ 60% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): vittorie a caso 78 · 70 · 69 · 60 · 67 · 71 · 60 · 66 · 52 · 36%, media 62,8% (sotto l'inverno, 64,7%, verso il ~62% di fine universo); nessun livello molto facile (la combinazione non è un debutto), il boss è il più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 181 si gioca fino alla vittoria.

### Stage 17 "Autunno": livelli 161–170 (#127)

- **Dieci figure in pixel art originale** sull'autunno (`scripts/stages/stage-17.ts`): foglia d'acero, castagna, pigna, pettirosso, cachi, ombrello, picchio, stivali da pioggia, tasso e il boss, il fienile (14×14). Foglio di anteprima in `docs/levels/stage-17.png`; nomi IT/EN.
- **Combinazione nuova: marrone + pietra** in ogni livello, senza ghiaccio né nascosti; nastro 2 e slot 2 in tutto lo stage. Dalla seconda figura in poi ≥ 50% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): vittorie a caso 83 · 71 · 73 · 64 · 73 · 73 · 63 · 72 · 56 · 38%, media 66%; nessun livello molto facile (la combinazione non è un debutto), il boss è il più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 161 si gioca fino alla vittoria.
### Stage 18 "Inverno": livelli 171–180 (#128)

- **Dieci figure in pixel art originale** sull'inverno (`scripts/stages/stage-18.ts`): abete, muffole, cioccolata calda, pupazzo di neve, ciuffolotto, slitta, renna, lanterna, volpe nella neve e il boss, la baita innevata (14×14). Foglio di anteprima in `docs/levels/stage-18.png`; nomi IT/EN.
- **Marrone + pietra + ghiaccio** in ogni livello, nessuna novità; nastro 2 e slot 2 in tutto lo stage. Legno e pellicce marroni, la neve in lilla; dalla seconda figura in poi ≥ 50% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): vittorie a caso 86 · 67 · 66 · 62 · 67 · 67 · 63 · 70 · 57 · 43%, media 64,7% (sotto il fiume, 69,4%, verso il ~62% di fine universo); nessun livello molto facile, il boss è il più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 171 si gioca fino alla vittoria.

### Stage 16 "Fiume": livelli 151–160 (#126)

- **Dieci figure in pixel art originale** sul fiume (`scripts/stages/stage-16.ts`): ninfea, trota, canoa, airone, libellula, anatra, martin pescatore, tife, lontra e il boss, il mulino ad acqua (14×14). Foglio di anteprima in `docs/levels/stage-16.png`; nomi IT/EN.
- **Pietra + ghiaccio** in ogni livello, niente marrone; nastro 2 e slot 2 in tutto lo stage. Dalla seconda figura in poi ≥ 40% di pixel secondari.
- **Curva** a dente di sega (#88): vittorie a caso 84 · 72 · 77 · 68 · 73 · 77 · 68 · 73 · 62 · 40%, media 69%; nessun livello molto facile, il boss è il più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 151 si gioca fino alla vittoria.

### Stage 15 "Giungla": livelli 141–150 (#125)

- **Dieci figure in pixel art originale** sulla giungla (`scripts/stages/stage-15.ts`): papaia, tucano, raganella, ara, orchidea, camaleonte, farfalla morpho, mango, pitone e il boss, il tempio perduto (14×14). Foglio di anteprima in `docs/levels/stage-15.png`; nomi IT/EN.
- **Debutto della pietra** (#95) al livello 141: la papaia è molto facile e ha due pietre disegnate a mano tra la polpa, dove un colpo si ferma per forza; il suggerimento compare una volta. Dal 142 le pietre stanno nei buchi e sui bordi delle figure. Nessun'altra meccanica nello stage; nastro 2 e slot 2 dopo il debutto.
- **Curva** (#88): vittorie a caso 100 · 79 · 74 · 70 · 75 · 75 · 69 · 78 · 61 · 48%, media 72,9%; solo il debutto è molto facile, il boss è il livello più duro. Dalla seconda figura ≥ 30% di pixel secondari. Ogni livello è dimostrato risolvibile dal solver.
- La build e2e `more-levels` non sostituisce più il 141 con un livello finto (tolta `e2e/fixtures/stone-debut.json`): il suggerimento della pietra si verifica sul 141 vero.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva) e sul debutto; e2e: il 141 mostra il suggerimento una volta, un colpo si ferma sulla pietra, il livello si vince.

### Stage 14 "Deserto": livelli 131–140 (#124)

- **Dieci figure in pixel art originale** sul deserto (`scripts/stages/stage-14.ts`): saguaro, dune, oasi, scorpione, fennec, serpente a sonagli, clessidra, piramide, avvoltoio e il boss, il cammello (14×14). Foglio di anteprima in `docs/levels/stage-14.png`; nomi IT/EN.
- **Marrone, ghiaccio e nascosti insieme** in ogni livello; nastro 2 e slot 2 in tutto lo stage. Dalla seconda figura in poi ≥ 30% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): respiro 87%, base 80%, gradini 72,5%, difficile 66%, boss 50%; media dello stage 75% di vittorie a caso, nessun livello molto facile. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 131 si gioca fino alla vittoria.

### Stage 13 "Prato": livelli 121–130 (#123)

- **Dieci figure nuove in pixel art originale** sul tema del prato, terzo stage dell'universo 2 (Natura): margherita, tarassaco, alveare, cavalletta, cestino da picnic, aquilone, carriola, spaventapasseri, gallo e, come boss, il mulino a vento (14×14). Nomi in italiano e inglese.
- **Meccaniche**: marrone e pixel nascosti, nessuna novità. Nastro 2 come in tutto l'universo, slot 2 o 3.
- **Curva** (#88): dente di sega con margherita di respiro (92% di vittorie a caso), base 81%, scalini al 70% e 74%, gallo difficile al 64%, mulino boss al 56%; media dello stage 75,5%, nessun livello molto facile. Figure con il 67–95% di pixel secondari o marroni.
- Test: e2e che gioca il livello 121 fino alla vittoria; chiavi i18n e regole della curva coperte dai test esistenti su tutti i livelli.

### Stage 12 "Montagna": livelli 111–120 (#122)

- **Dieci figure nuove in pixel art**, disegnate a mano sul tema: scarpone, cima innevata, baita, marmotta, stella alpina, zaino, stambecco, funivia, aquila e, come boss, la vetta (14×14, la tela più grande dello stage). Nomi IT/EN.
- **Marrone + ghiaccio** in ogni livello: roccia, legno e pelo in marrone, il ghiaccio sui pixel primari. Nessuna meccanica nuova, quindi nessun livello molto facile: il respiro (111) si vince a caso nell'88% dei casi. Dopo il respiro ogni figura ha almeno il 30% di pixel misti o marroni. Nastro 2 e slot 2, mai sopra la fine dell'universo 1.
- **Curva** (#88, dente di sega dello stage): vittorie a caso 88 · 79 · 80 · 68 · 81 · 83 · 73 · 81 · 61 · 53%, media 75%; il boss è il livello più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (id e boss, nomi IT/EN, meccaniche, tela/nastro/slot, regole della curva); e2e: la vetta (120) si gioca fino alla vittoria.

### Stage 11 "Bosco": livelli 101–110 (#121)

- **Stage 11 completo**, primo dell'universo 2 (Natura): dopo la ghianda (101) arrivano porcino, abete, riccio, scoiattolo, nido, castoro, baita, cervo e la quercia (110, boss 14×14). Pixel art originale disegnata a mano, con il marrone nelle figure (tronchi, aculei, nidi, corna); unica meccanica dello stage il marrone.
- **Curva** (#88): dente di sega con il 109 difficile e il boss il più duro; solo il 101 è molto facile. Vittorie casuali 98 · 82 · 88 · 75 · 80 · 83 · 73 · 83 · 72 · 58%, media 79% (fine dell'universo 1: 65%, inizio: 97%). Nastro 2 e slot 2–3, mai sopra la fine dell'universo 1. Livelli 1–101 identici.
- Nomi IT/EN di tutti i livelli; foglio di anteprima `docs/levels/stage-11.png`.
- Test: unit sullo stage (completo, nomi, sola meccanica marrone, ≥ 30% di pixel da mescolare, nastro e slot, dente di sega, media tra fine e inizio dell'universo 1); e2e: la quercia (110) si gioca fino alla vittoria e resta salvata.

### Meccanica: pixel marrone (#94)

- **Marrone = rosso + giallo + blu**: un pixel marrone (codice `K` nelle immagini) è completo dopo tre colpi, uno per primario, in qualsiasi ordine; finché non arrivano tutti e tre blocca la sua corsia come gli altri pixel non finiti. Le munizioni e il solver contano il colpo in più; il generatore può piazzare pixel marroni in modo deterministico (`special.brown`).
- **Grafica**: marrone gouache `#8B5A3C`; un pixel marrone a metà mostra tre spicchi fissi (rosso in alto a sinistra, giallo in alto a destra, blu in basso) separati da divisori, così ciò che manca si legge dalla posizione e non solo dal colore.
- **Spiegazione**: suggerimento una tantum al primo livello con il marrone e quarta pagina di "Come si gioca" ("Rosso + giallo + blu = marrone"), in italiano e inglese. Per le regole della curva (#88) il marrone conta come pixel misto ed è una meccanica a sé, quindi il suo livello di debutto può essere molto facile.
- **Livello di debutto 101, "Ghianda"**: primo livello dello stage 11 (Bosco) e dell'universo 2 (Natura), che si apre finendo il livello 100. Lo stage e l'universo sono ancora in costruzione (#100); il 101 è molto facile (98% di vittorie a caso) e dimostrato risolvibile. Livelli 1–100 identici.
- Test: unit su regole (tre colpi in ordine qualsiasi, colore ripetuto rifiutato, corsia bloccata, rivelazione dei nascosti), formato e munizioni, solver e simulazione con le stesse regole, generatore deterministico, suggerimento, curva e spicchi; e2e: il suggerimento compare al 101 una volta sola e il livello si vince, quarta pagina di "Come si gioca".

### Meccanica: pietra (#95)

- **Pietra**: una cella fissa senza pixel in cui la vernice si ferma, senza passare oltre. I pixel dietro si dipingono da un altro lato del nastro; la pietra non conta per la vittoria. Debutto previsto al livello 141 (universo 2), con i contenuti di #100.
- **Formato livello**: codice `s` nell'`overlay`, solo su una cella vuota. `parseLevel` rifiuta, prima del solver e con un messaggio chiaro, una pietra su un pixel e un pixel murato su tutti e quattro i lati. La regola sta in `src/core/rules.ts` (`findTarget`), condivisa da gioco, `solve` e `levelWinRate`.
- **Generatore**: `special: { stone: N }` piazza N pietre in modo deterministico sulle celle vuote che toccano la figura (buchi o bordo), mai murando un pixel; le pietre si estraggono dopo ghiaccio e nascosti, quindi i livelli esistenti restano identici.
- **Grafica disegnata in codice**: blocco grigio smussato con puntini, riconoscibile senza colore a 14 px; un colpo fermato da una pietra fa uno schizzo grigio senza colore. Token `stone` e `stoneDark` in `src/game/theme.ts`.
- **Spiegazione**: suggerimento una tantum al primo livello con pietre e quarta pagina in "Come si gioca" (IT/EN).
- Test: unit su formato, raggiungibilità, regole, simulazione, solver, generatore deterministico, suggerimento e curva; e2e sul livello di debutto (141) nella build con più livelli: il suggerimento compare, un colpo si ferma sulla pietra, il livello si vince.

### Meccanica: secchiello coperto (#97)

- **Secchiello coperto**: un secchiello dietro il primo della sua colonna può essere coperto: mostra "?" sul colore del coperchio (token `hidden`, lo stesso dei pixel nascosti) e la sua vernice resta un segreto finché non arriva in cima. Lì si gira (animazione di 420 ms e un piccolo suono) e mostra il colore; da lì in poi resta scoperto. Le munizioni restano visibili.
- **Regole invariate**: il colore resta nel dato (`covered?: boolean` sullo `ShooterSpec`), quindi simulazione, `solve` e `levelWinRate` giocano il livello come prima; la regola di visibilità `colorShown` sta in `src/core/rules.ts`. `parseLevel` rifiuta un `covered` che non sia booleano e un primo secchiello coperto (non nasconderebbe niente).
- **Generatore**: `special.covered` è la quota di secchielli coperti (es. 0,25), scelti con il seme del livello e mai il primo di una colonna. I livelli esistenti non cambiano.
- **Suggerimento una tantum** al primo livello con secchielli coperti e **quarta scheda** in "Come si gioca" ("Sorpresa"), IT/EN.
- Il debutto vero (livello 241) arriva con l'universo 3 (#101). Il livello di debutto è già pronto come spec (`e2e/fixtures/covered-debut.ts`, fascia "molto facile") e lo serve la build e2e `--mode covered-debut`. La difficoltà è solo umana: va confermata col playtest (#66) prima di rilasciare l'universo 3.
- Test: unit su formato, regola, generatore deterministico (quota, mai il primo di colonna, errori), solver e probe invariati, suggerimento; e2e sul livello di debutto (suggerimento, "?" nelle colonne, colore scoperto in cima, vittoria) e su tutte e quattro le schede di "Come si gioca".

### Murale dell'universo e skin per universo (#92)

- **Murale**: ogni universo ha un grande quadro diviso in 100 tessere, disegnato in codice con i colori del gioco (Atelier: ruota dei colori; Natura, Viaggio, Mare e cielo, Cosmo per i prossimi). La tessera N si colora completando il livello N dell'universo; la prima è già dipinta quando l'universo si apre. Prende il posto dei segnaposto nella card del selettore, nell'album e nella festa di fine universo (le tessere si aggiungono una alla volta).
- **Album per universo**: una pagina per universo con il murale, l'avanzamento "Murale x/100", un pulsante per ogni stage (✓ se completo) e lo stile dell'universo da vincere; frecce ‹ › per passare da un universo all'altro (anche quelli chiusi, vuoti e col lucchetto). Si apre dal pulsante "Album" del selettore o con ◀ dalla pagina di uno stage, che ora sfoglia solo gli stage del suo universo.
- **Skin per universo**: gli universi 2–5 hanno uno stile nuovo ciascuno (fiori, francobolli, bolle, orbite), sbloccato finendo l'universo e mostrato nella festa; ogni stage completato del suo universo sblocca una variante di colore (solo cambio di palette, 10 per universo). L'universo 1 tiene i suoi 10 stili per stage. I colori sono token nuovi in `src/game/theme.ts` (`gold`, `SKIN_COLORS`, `MURAL_PAINT`).
- **Salvataggi compatibili**: gli stili già guadagnati restano validi; uno stile non guadagnato in un salvataggio torna a "classico". Livelli identici.
- Test: unit su murale (tessere = livelli completati dell'universo + tessera regalo, universo chiuso vuoto, tessere dei livelli che non esistono ancora), skin e varianti secondo i progressi, salvataggi con skin non guadagnate; e2e a 360×640 e 412×915 sulla build con 205 livelli (completare un livello colora la sua tessera nel selettore e nell'album, album per universo, variante sbloccata dal primo stage dell'universo 2, stile dell'universo nella festa), con il controllo "niente fuori schermo" sulle schermate nuove.

## 0.5.0 — universi: selettore, mappa per universo e festa di fine universo (29 ottobre 2026)

Il gioco ora è organizzato in **universi** da 100 livelli: oggi c'è l'universo 1 (Atelier), con i 100 livelli di sempre, e tutto è pronto per i prossimi. La mappa mostra un universo alla volta, con il suo avanzamento x/100; un selettore elenca gli universi, anche quelli ancora chiusi, e finire l'ultimo livello di un universo apre una festa. **I progressi restano validi** e i livelli non cambiano.

### Selettore degli universi, mappa per universo e festa di fine universo (#91)

- **Selettore degli universi**: si apre dalla barra sotto il titolo della mappa. Una card per universo con nome, colore, avanzamento x/100 e il primo quadro come anteprima. Un universo chiuso resta visibile (lucchetto, sagoma del quadro, "Completa il livello N per aprire"); toccarlo lo scuote e spiega cosa manca, senza aprirlo.
- **Mappa per universo**: solo i livelli dell'universo scelto (al massimo 100 nodi); si apre sull'universo del livello corrente. "Altri livelli in arrivo" solo sull'ultimo universo in costruzione.
- **Barre di avanzamento**: universo x/100 nella barra del titolo della mappa e nel pannello di vittoria, con "+1" alla prima vittoria; stage x/10 nelle fasce come prima.
- **Festa di fine universo**: vincendo l'ultimo livello di un universo, il pulsante porta alla festa: i quadri dell'universo si compongono in un mosaico, poi l'universo successivo si apre con "Vai all'universo N+1" (o "Un nuovo universo è in arrivo"). Una volta sola; si rivede dall'album dell'ultimo stage. Murale vero e skin nuova arrivano con #92.
- La tabella degli universi passa in `scripts/universes.ts`; `npm run gen:levels` la scrive in `src/levels/universes.json` (verificata da `--check`). Livelli identici.
- Test: unit sul selettore (card, layout, universo della mappa, universo appena completato); e2e a 360×640 e 412×915 su una build con 205 livelli (universo chiuso non selezionabile, festa una sola volta e rivista dall'album, mappa dell'universo 2 dal 101); il selettore è nel controllo "niente fuori schermo" su tutti i formati.

### Universi da 100 livelli e sblocco a fine universo (#90)

- **Universi nel core**: `src/core/universes.ts` (puro) con la tabella `UNIVERSES` (nome, colore del tema, tela massima) e le regole: un universo è una serie di 10 stage; l'universo N+1 si apre solo completando l'ultimo livello dell'universo N. Funzioni: `universeOf`, `universeLevels`, `lastLevelOf`, `isUniverseUnlocked`, `canOpenLevel`.
- **Il core rifiuta i livelli chiusi**: la scena di gioco apre un livello solo se `canOpenLevel` lo permette, e i salvataggi modificati a mano perdono i completati e lo sblocco oltre gli universi aperti. Chi ha finito i 100 livelli di oggi troverà aperto il livello 101 quando arriverà l'universo 2.
- **Validazione** in `npm run gen:levels`: ogni stage in un universo della tabella, solo l'ultimo universo incompleto, figure entro la tela del loro universo (14×14 fino all'universo 4, 16×16 al massimo).
- Testi IT/EN: `universe.atelier`, `universe.locked` ("Completa il livello {n} per aprire"). Oggi c'è un solo universo: in gioco non cambia nulla, livelli identici.
- Test: 1, 2 e 5 universi, universo incompleto, id non multipli di 100, salvataggio di 100 livelli su un gioco da 200, salvataggi manomessi, tela 17×17 rifiutata; e2e su una build con 205 livelli (`--mode more-levels`, ora con un universo 2 completo): un salvataggio manomesso non apre il 101 senza il 100.
- Regola "come si aggiunge un universo" in `docs/strategia-progetto.md`.

## 0.4.0 — curva di difficoltà ricalibrata e contenuti scalabili (28 ottobre 2026)

Sempre 100 livelli in 10 stage, con la difficoltà rifatta: misurata con le regole vere del gioco, controllata da regole automatiche, e "molto facile" solo nei primi livelli. Molti livelli cambiano (inventari dei secchielli, nastro, slot e 29 figure ridisegnate), ma id e nomi restano gli stessi: **i progressi restano validi**. In più: capienza del nastro visibile, progressi al sicuro tra un aggiornamento e l'altro, layout adattivo a ogni schermo e un gioco pronto a ricevere nuovi stage.

### Universo 1: "molto facile" solo nei primi livelli (#89)

- **Livelli molto facili da 55 a 17** (≥ 95% di vittorie per il giocatore casuale): restano solo l'introduzione (1–8) e il primo livello di ogni stage. Le regole della curva (#88) passano senza errori: `scripts/stages/curve-known.ts` è vuoto.
- **Curva per stage** (media vittorie casuali): 97, 89, 88, 85, 79, 76, 74, 68, 64, 65%. Stage 1: 9–10 con 2 slot. Stage 2: nastro 3 e slot 2 dopo il respiro. Il faro (boss 50) ora è il più duro del suo stage e lo stage 8 è più duro del 7.
- **29 figure ridisegnate** (cornice di un altro colore o più colori secondari), stessi soggetti e nomi: frutti dello stage 2, ape, lumaca, cane, foglia, carota, granchio, barca, faro, lampione, ponte, fontana, caramella, pizza, autobus, camion, treno, elicottero, scooter, sottomarino, luna, razzo.
- 45 livelli cambiano, 55 identici; **id, nomi e numero dei livelli invariati, i progressi restano validi**.
- Test: al massimo 17 livelli molto facili, solo intro e primi di stage; nessuna fascia oltre l'introduzione che arrivi al 95%. Report prima/dopo: `docs/reports/2026-10-05-curva-universo-1.md`.

### Contenuti scalabili: niente più limiti fissi di 10 stage / 100 livelli (#74)

- **Uno stage nuovo è un file nuovo**: `scripts/stages/index.ts` trova da solo i `stage-NN.ts`; chiave del nome e colore della fascia stanno nel file dello stage, non più in una tabella di 10 voci in `src/core/stages.ts`.
- `npm run gen:levels` scrive anche `src/levels/stages.json` (chiave, colore, completo o no), letto da mappa e album; `--check` verifica anche questo file. I livelli **non cambiano** (`levels.json` identico).
- "Altri livelli in arrivo" compare quando l'ultimo stage non è completo, non più con un conto su 100. L'album sfoglia tutti gli stage che esistono; uno stage senza skin non mostra il premio, e completarlo non promette uno stile nuovo.
- Solo l'ultimo stage può essere incompleto: così gli id dei livelli non cambiano mai e i **salvataggi restano validi** dopo un aggiornamento; chi aveva finito il gioco trova aperto il primo livello nuovo.
- Test: 1, 10, 11 e 12 stage, stage da 5 livelli, totali non multipli di 10, salvataggio di 100 livelli su un gioco da 110; e2e su una build con 115 livelli (`--mode more-levels`): salvataggio finito che apre il primo livello nuovo, stage 11 completato, album dello stage in costruzione. Gli e2e che usavano il livello 100 usano l'ultimo livello.
- Regola "come si aggiunge uno stage" in `docs/strategia-progetto.md`.

### Regole automatiche della curva di difficoltà (#88)

- **Curva controllata da regole**, non a occhio: `src/core/curve.ts` (puro, soglie in una sola tabella) verifica che "molto facile" (≥ 95% a caso) resti nei livelli 1–8, nei primi livelli di stage dell'universo 1 e ai debutti di una meccanica; il dente di sega dentro lo stage (respiro, base, gradini, livello duro, boss il più duro salvo eccezioni dichiarate); la fine di ogni universo più dura dell'inizio; l'inizio di un universo tra la fine e l'inizio del precedente; gli obiettivi provvisori di fine universo; nastro 1 o slot 1 solo sui boss dall'universo 3, mai insieme. Pochi colori secondari e livelli duri troppo lunghi sono avvisi.
- `npm run gen:levels` stampa errori e avvisi e fallisce su un errore nuovo; `scripts/difficulty-report.ts` mostra la curva per universo. Funziona con N universi e stage incompleti.
- I livelli **non cambiano**. Gli errori già presenti nell'universo 1 (troppi livelli molto facili, dente di sega irregolare) sono elencati in `scripts/stages/curve-known.ts` e li corregge #89.

### Difficoltà con nastro e slot, curva ricalibrata (#75)

- **Misura nuova**: la difficoltà di un livello (`levelWinRate`) si misura con 200 partite giocate tick per tick con le regole vere del gioco: un giocatore casuale lancia appena il nastro ha posto. Capienza del nastro e slot d'attesa ora pesano insieme; prima si simulava un secchiello alla volta (come un nastro da 1).
- **Curva nuova**: nastro e slot scendono a gradini per stage — stage 3–4 nastro 3 (boss 2), stage 5–7 nastro 3 e poi 2 verso il boss, stage 8–10 nastro 2; slot mai sotto 2. Con la misura nuova la media di vittorie casuali scende da 94% (piatta negli stage 3–10) a 94% → 69% (stage 3 → 10), con livelli di respiro a inizio stage.
- **Livelli rigenerati dagli stage 3 in poi**: stesse immagini, stessi id e nomi, quindi **i progressi restano validi**; cambiano però gli **inventari dei secchielli** (colori, colpi e ordine nelle colonne), la capienza del nastro e in diversi livelli gli slot. Stage 1–2 identici.
- Test: misura deterministica, nastro più piccolo o meno slot mai più facili, ogni livello nella fascia della sua spec, curva che sale a gruppi di stage, nastro che non torna a crescere. Report prima/dopo: `docs/reports/2026-10-02-curva-nastro-slot.md`.
- Limite: il giocatore casuale non è una persona; la difficoltà percepita va confermata con i playtest (#66, #42).

### Capienza del nastro visibile (#76)

- **Indicatore del nastro** sulla riga "Attesa", a sinistra: "NASTRO 1/2" più un segnaposto per posto (pieno/vuoto: forma e numero, non solo colore), più scuro quando il nastro è pieno. L'occupazione (`beltLoad`, `beltFull`) viene da `src/core/sim.ts`.
- **Tocco rifiutato non più silenzioso**: se il nastro è pieno, la colonna o lo slot toccato fa una breve scossa, l'indicatore si evidenzia e c'è un suono sobrio sintetizzato.
- **Suggerimento una tantum "Nastro pieno"** la prima volta che il limite blocca un tocco (ogni livello ha un limite), con la capienza del livello; salvato con gli altri suggerimenti. Testi IT/EN.
- Test: unit su occupazione del nastro e suggerimento; e2e a 360×640 sul livello 71 (nastro da 2): tocco rifiutato senza lancio, suggerimento mostrato e ricordato, indicatore che non tocca l'etichetta "Attesa".

### Progressi al sicuro e layout adattivo

- **Progressi al sicuro (#64)**: le build debug dell'APK hanno ora una firma fissa e un `versionCode` crescente, quindi un nuovo APK si installa **sopra** il precedente senza perdere i dati (il primo con la nuova firma richiede una sola disinstallazione). Regole di backup Android esplicite. In Impostazioni → *Backup e azzeramento*: codice di salvataggio da copiare e incollare (con controllo di integrità, conferma se è più vecchio dei progressi attuali) e *Azzera i progressi* con conferma, l'unico modo in cui i dati si cancellano (lingua e audio restano).
- **Layout adattivo (#62)**: l'altezza del gioco segue lo schermo (1280–1900); nel livello i comandi (slot e colonne) stanno ancorati al bordo basso, vicino al pollice, e la tela cresce e si centra nello spazio libero; Come si gioca e Album ancorano pulsanti e testi in basso; area di tocco degli slot proporzionale alla scala reale (≥ 44 px anche a 280 px di larghezza); il ridimensionamento della finestra ricalcola la scena corrente senza perdere partita, pagina o scroll. Tablet e finestre larghe: gioco verticale centrato con bande laterali.
- **Schermo intero su Android**: il gioco si misura sull'area davvero libera (finestra meno barra di stato/navigazione e notch, via `--safe-area-inset-*` o `env()`), e si ricalcola quando le barre cambiano; altezza massima 1700 (oltre, bande laterali invece di un layout allungato); "Come si gioca" meno stirato. Nelle Impostazioni una riga piccola mostra le misure della finestra per la diagnosi.
- Test (#57): matrice di 10 formati di schermo in e2e (nessun elemento fuori schermo, comandi nella metà bassa, bersagli ≥ 44 px, screenshot come artefatti), unit test della funzione di layout per ogni altezza, test e2e del backup/reset.

### Test su logica, PWA e APK (#63)

- Logica spostata dalle scene a `src/core` e coperta da unit test: tocco sulla mappa (`mapTapTarget`), tasti di scroll, pagine e swipe di Come si gioca (`howto.ts`), azzeramento (`resetProgress`), decisione di ridimensionamento (`relayoutAction`).
- Test e2e del service worker/PWA: installazione, precache, apertura offline con i progressi intatti, modifiche fatte offline.
- Smoke test dell'APK su emulatore Android in CI: avvio fino alla mappa, canvas dentro l'area libera, firma uguale alla chiave debug committata, aggiornamento sopra la stessa versione con progressi conservati.
- Tolta la riga di diagnosi dalle Impostazioni.

### Prestazioni e QA (epic #44)

- **Mappa più fluida su APK** (#60, #46): nodi e fasce in pochi `Graphics`, etichette create solo quando entrano nello schermo e nascoste fuori, un solo hit-test sul tocco al posto di ~110 zone interattive.
- **Gioco**: i testi dei secchielli si aggiornano solo se cambiano (#45); i pixel si ridisegnano una volta per frame (#48); la soluzione si calcola solo quando serve (#48).
- Avvio: Phaser in un chunk separato (#47).
- Salvataggi: `unlocked` riconciliato con i livelli completati e limitato a 1–100, id fuori range e array enormi scartati, stile non sbloccato ignorato (#53, #54).
- Mappa: scroll con rotella e tastiera (#51); zone di tocco dei pulsanti ≥ 88 unità (#49); testi piccoli e contrasto migliorati (#50).
- Test: attese e2e legate ai tick di simulazione (#55), config Playwright/CI con report, trace e retry (#56), nuovi test (italiano, rotella, secchielli in parallelo, secondo ingorgo) e soglie di coverage alzate (#58).
- Rifiniture (#52): stella del boss 100 non più coperta dalla barra, invito a ruotare il telefono in orizzontale (web/PWA), guida del livello 1 con testo sotto il titolo e mano sotto la colonna, Come si gioca centrato, icona audio spento = nota sbiadita e più distante da ⟲, "Stage" → "Mondo" in italiano.
- Come si gioca: scorri tra le pagine con swipe, frecce o toccando i puntini; ogni apertura riparte dalla prima pagina (Phaser conservava i dati dell'ultima apertura).
- Release: un tag senza `-rc` crea una release normale, e una già esistente viene aggiornata (#59).

## 0.3.0 — 100 livelli in 10 stage (1 ottobre 2026)

### Novità di gioco
- **100 livelli** (prima 15), in **10 stage tematici da 10**: Atelier, Frutta, Animali, Giardino e fiori, Mare, Città ed edifici, Cibo e dolci, Veicoli, Spazio, Fantasia. 85 immagini nuove in pixel art originale; i 15 quadri esistenti sono stati ridistribuiti negli stage del loro tema.
- **Livello boss** (★) ogni 10: il 10° di ogni stage è più grande e difficile; il 100 è il drago.
- **Pixel ghiacciati** (dallo stage 4): servono due colpi del loro colore.
- **Pixel nascosti** (dallo stage 6): "?" che blocca la corsia finché un vicino non è completo.
- **Nastro corto** nello stage 8: al massimo 2 secchielli insieme.
- **Mappa a stage** scorrevole, con intestazione e avanzamento per stage; si apre sul livello a cui sei arrivato.
- **Album degli stage**: i quadri dipinti di ogni stage, silhouette per quelli mancanti. Completando uno stage si sblocca uno **stile per i secchielli** (10 stili: pois, righe, macchie, foglie, onde, scacchi, codette, strisce da corsa, stelle, oro).
- Suggerimenti illustrati per ghiaccio e pixel nascosti, in inglese e italiano.

### Sotto il cofano
- Livelli organizzati per stage (`scripts/stages`), generazione incrementale e verificata in CI, fogli di anteprima della pixel art (`docs/levels`).
- Regole di colpo condivise tra simulazione e solver; ogni livello rilasciato ha una soluzione verificata nella simulazione.
- Difficoltà calibrata per posizione nello stage, con un minimo di 6 secchielli dallo stage 3 (niente livelli con pochi secchielli giganti).
- **Correzione**: il solver poteva indicare lo slot d'attesa sbagliato in una soluzione con rilanci; ora gli slot sono gestiti per posizione come nel gioco.

### Attenzione
- L'ordine dei livelli è cambiato rispetto alla 0.2: i progressi salvati nelle versioni di prova si riferiscono ai vecchi livelli. Se la mappa sembra strana, reinstalla l'app o cancella i dati del sito.

## 0.2.0 — Lingue e tutorial
- Inglese di default, italiano dalle Impostazioni (⚙).
- Livello 1 guidato, suggerimenti una tantum (mixing, corsia bloccata, slot), schermata "Come si gioca".

## 0.1.0 — MVP
- Meccanica base: secchielli di colori primari sul nastro, mixing sulla tela, slot d'attesa, ingorgo con +1 slot.
- 15 livelli verificati dal solver, mappa, salvataggio, PWA e APK Android di debug.
