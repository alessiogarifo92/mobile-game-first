# 500 livelli in 5 universi — dati e decisioni

Data: 5 ottobre 2026 · Epic: #87 · Milestone: "500 livelli: 5 universi" · Prototipo delle misure: [`2026-10-05-prototipo-meccaniche.patch`](https://github.com/alessiogarifo92/mobile-game-first/blob/5c461341603e699ba4aa1fd7ecc6e0b736c5b23e/docs/reports/2026-10-05-prototipo-meccaniche.patch) (non su main: codice di prova, fermo al commit `5c46134`; si applica sul ramo di #75, commit `8b63079`; `STAGES=8,9,10 SEEDS=3 npx tsx scripts/exp-mechanics.ts`).

Richiesta: arrivare ad almeno 500 livelli, in universi da 100; difficoltà molto bassa solo nei primi livelli, poi in salita; nuovi modi per aumentare la difficoltà e tenere alta l'attenzione; un universo si sblocca e si può scegliere solo dopo l'ultimo livello del precedente. Le scelte sotto sono prese sui dati (misure nel codice + ricerca), non a gusto.

## 1. Punto di partenza misurato

Misura usata ovunque: `levelWinRate` di #75 (PR #86): 200 partite di un giocatore casuale con le regole vere di `sim.ts` (nastro e slot pesano insieme). Una percentuale alta significa che l'ordine delle mosse conta poco.

| Dato | Valore | Conseguenza |
|---|---|---|
| Livelli vinti ≥ 95% a caso (dopo #75) | **55 su 100** (47 ≥ 99%); stage 1–2: 20 su 20; stage 3–10: 3–6 per stage | "Molto facile" oggi dura metà gioco: contro la richiesta |
| Leve nastro/slot nell'universo 1 | nastro 2 in 47 livelli, slot 2 in 50; stage 9–10 già a nastro 2 | Le leve numeriche sono **quasi al minimo**: per altri 400 livelli servono meccaniche nuove |
| Figure "che non si induriscono" (#75) | 12 figure restano ~100% con ogni leva; **9 su 12 hanno meno del 30% di pixel secondari** | Regola per la pixel art nuova (sezione 4.4) |
| Livelli con < 30% di secondari (stage 3–10) | vittorie medie **91%** contro **77%** con ≥ 30% | idem |
| Costo generazione | 100 livelli in ~7,5 s (`--force`), ~30 ms a livello | 500 livelli ~40 s: nessun problema per la CI |
| Peso dei livelli | `levels.json` 92 KB, **9 KB gzip** per 100 livelli | 500 livelli ≈ 45 KB gzip: un solo file va bene, niente caricamento pigro |
| Tela | area utile 472 unità logiche (236 px su un telefono largo 360 px) | 14×14 → 16,5 px a pixel; **16×16 → 14,5 px**; 18×18 → 13 px; 20×20 → 11,5 px |

## 2. Misura delle meccaniche candidate (prototipo)

Prototipo usa-e-getta delle regole in `rules.ts`/`sim.ts`/`solver.ts`, applicato agli stessi livelli (stesse immagini, colonne, nastro, slot, ghiaccio e nascosti; 3 seed per livello), confronto a coppie con il livello senza la meccanica. "Δ" = punti percentuali di vittorie casuali (negativo = più difficile).

| Meccanica (quantità nel test) | Δ stage 3–10 (240 livelli) | Δ stage 8–10 (90 livelli) | Distribuzioni risolvibili | Verdetto |
|---|---|---|---|---|
| **Marrone** R+Y+B (15% dei pixel) | −4,6 | **−7,3** | 100% | ✅ Universo 2 |
| **Pietra** (5 celle) | −3,1 | −4,2 | 98–99% | ✅ Universo 2 |
| **Lucchetto e chiave** (2 chiavi, 4 lucchetti) | −4,4 | −4,7 | 100% | ✅ Universo 3 |
| **Pellicola colorata** (8% dei pixel) | −5,0 | −6,6 | 100% | ✅ Universo 4 |
| **Corsie cieche** (mezzo lato del nastro) | −7,3 | **−7,7** | 98–100% | ✅ Universo 4 (dopo playtest delle altre) |
| Secchiello coperto | 0 per costruzione (il giocatore casuale non guarda i colori) | — | 100% | ✅ Universo 3, difficoltà solo umana → **va confermata col playtest** |
| Marrone + pietra insieme | −9,4 | −12,5 | 95–96% | Gli effetti **si sommano** → l'universo 5 combina |
| Ghiaccio doppio | −1,4 | −1,6 | 100% | ❌ troppo debole per essere "una novità" |
| Secchielli collegati (1 su 3) | **+6,4** | **+8,3** | 100% | ❌ rende il gioco **più facile** (più secchielli insieme, come visto in #75) |
| Nastro 1 | −20,4 | −16,8 | 100% | ⚠️ solo per alcuni boss: toglie il gioco "a flusso" |
| Slot −1 | −29,1 | −32,2 | 63–99% | ⚠️ solo per alcuni boss; mai insieme a nastro 1 |
| Nastro più veloce | non misurabile (tempo reale) | — | — | ❌ pressione di riflessi, contro il tono rilassato |

Costo: tutte le meccaniche restano sotto ~0,3 s a livello in generazione (solver: mediana 10–16 nodi).

## 3. Ricerca esterna usata nelle decisioni

| Fonte | Dato | Uso |
|---|---|---|
| Benchmark retention 2026 (Segwise) | puzzle: D1 31,9%, D7 12,2%, **D30 5,4%** | Pochi arrivano al livello 100: prima si sistema l'universo 1, poi i contenuti |
| Retention F2P (arXiv 1607.03202) | punteggi alti nei primi livelli (troppo facili) → **meno** ritorno | "Molto facile" solo all'inizio |
| Royal Match | **100 livelli ogni 2 settimane**; 1 stella per livello come valuta, nessun voto da 1 a 3 stelle; livelli duri segnalati, un duro "travestito" prima del super duro | Universo = 100 livelli = un aggiornamento; niente stelle; etichetta "Difficile" (#73) |
| Match-3 di produzione | un ostacolo nuovo ogni **10–20 livelli** | Una novità ogni 20 livelli (meccanica nuova o combinazione mai vista) |
| King | se un livello è molto difficile deve essere **corto** | Tetto di secchielli per Difficile/Boss |
| Near-miss | chi perde "per un pelo" riprova molto di più | Messaggio "mancavano N pixel", con dati veri |
| DDA | aiutare dopo una serie di sconfitte: fino a **+9%** engagement, monetizzazione neutra | Aiuto gratuito dopo 3 sconfitte |
| Psicologia | flow (sfida ≈ abilità), goal gradient, Zeigarnik, endowed progress, peak-end | Barre di avanzamento, murale, festa di fine universo |
| Pixel Flow (stesso sottogenere) | 559+ livelli; muri, lucchetti/chiavi, scatole, secchielli sorpresa e collegati | Pietra, lucchetto, coperto hanno precedenti; collegati scartati dai nostri dati |
| Dark pattern (UE/UK 2025) | sotto esame near-miss artificiali, timer, loot box | Paletti etici (sezione 5) |

## 4. Decisioni

### 4.1 Struttura e sblocco
- **5 universi × 10 stage × 10 livelli**, id globali 1–500 (i salvataggi attuali restano validi). Boss = 10° livello di ogni stage; il livello 100 di ogni universo è il boss finale.
- **Sblocco**: l'universo N+1 si apre solo completando l'ultimo livello dell'universo N. Prima è **visibile ma chiuso**, con anteprima ("Completa il livello 100 per aprire"). Gli universi finiti restano rigiocabili.
- **Mappa per universo** (al massimo 100 nodi) e **selettore** degli universi.
- **Rilascio**: un universo per aggiornamento, nell'ordine; prima l'universo 1 ritoccato. Ogni universo passa da report della curva e playtest (#66) prima del rilascio.

| Universo | Livelli | Tema | Meccaniche nuove (livello di debutto) | Tela max |
|---|---|---|---|---|
| 1 Atelier | 1–100 | attuale | ghiaccio (31), nascosti (51) | 14×14 |
| 2 Natura | 101–200 | bosco, montagna, deserto, giungla, stagioni… | **marrone** (101), **pietra** (141) | 14×14 |
| 3 Viaggio | 201–300 | città, monumenti, feste, sport… | **lucchetto e chiave** (201), **secchiello coperto** (241) | 14×14 |
| 4 Mare e cielo | 301–400 | abissi, isole, nuvole, mongolfiere… | **pellicola colorata** (301), **corsie cieche** (341) | 14×14 |
| 5 Cosmo | 401–500 | pianeti, robot, sogni, mito… | **combinazioni** di due meccaniche, una coppia nuova ogni 2 stage | **16×16** |

Ogni 20 livelli arriva qualcosa di nuovo: una meccanica, o una combinazione mai vista.

### 4.2 Curva di difficoltà
- **"Molto facile"** = vinto a caso ≥ 95%. Ammesso solo: livelli 1–8; il primo livello di ogni stage dell'universo 1 (respiro); il livello di debutto di ogni meccanica. Universo 1: da 55 a **≤ 17** livelli. Universi 2–5: solo ai debutti.
- **Tre denti di sega annidati**:
  1. *Stage*: `1 respiro · 2–3 base · 4 base+1 · 5–6 base · 7 base+1 · 8 base · 9 duro "travestito" · 10 boss`.
  2. *Universo*: gli stage 1 e 5 portano la meccanica nuova con un calo; gli stage 9–10 sono i più duri.
  3. *Tra universi*: l'inizio di N+1 è più facile della fine di N ma più duro dell'inizio di N.
- **Obiettivi provvisori** (media vittorie casuali per stage; da tarare con le soglie di #71 e i playtest):

| Universo | Primo stage | Ultimo stage | Boss più duro (minimo) |
|---|---|---|---|
| 1 | livelli 1–8 ≥ 95%, stage medio ~90% | ~69% (oggi) | ≥ 35% |
| 2 | ~80% | ~62% | ≥ 30% |
| 3 | ~74% | ~56% | ≥ 25% |
| 4 | ~68% | ~50% | ≥ 22% |
| 5 | ~62% | ~45% | ≥ 20% |

  Ogni fine universo scende di ~6–7 punti: è quanto vale una meccanica nuova (−5/−8) o una combinazione (−9/−12) nei dati della sezione 2.
- **Mix di fasce** (nomi di #71: Facile/Normale/Difficile/Boss):

| Universo | Molto facile | Facile | Normale | Difficile | Boss |
|---|---|---|---|---|---|
| 1 | ≤ 17% | 15% | 45% | 13% | 10% |
| 2 | 2% | 13% | 45% | 30% | 10% |
| 3 | 2% | 10% | 40% | 38% | 10% |
| 4 | 2% | 8% | 35% | 45% | 10% |
| 5 | – | 8% | 30% | 52% | 10% |

- **Livelli duri corti**: per Difficile e Boss un tetto di secchielli (decisioni), da fissare con i tempi di partita misurati dal playtest #66.
- **Nastro 1 o slot ridotto di uno**: solo per alcuni boss dall'universo 3, mai tutti e due insieme.

### 4.3 Interesse e motivazione
| Decisione | Leva | Dato |
|---|---|---|
| ✅ **Murale dell'universo**: i 100 quadri formano un'immagine grande; il primo pezzo è già dipinto | Zeigarnik, endowed progress | estende album #40 e galleria #15 |
| ✅ **Barre** x/100 (universo) e x/10 (stage) | goal gradient | |
| ✅ **Universo successivo visibile ma chiuso** | curiosità | richiesta dell'utente |
| ✅ **Festa di fine universo** (murale completo, skin nuova, apertura) | peak-end | |
| ✅ **"Mancavano N pixel"** a fine partita persa | near-miss onesto | |
| ✅ **Aiuto gratuito dopo 3 sconfitte**: il solver suggerisce la prossima mossa buona | DDA trasparente | +9% engagement, monetizzazione neutra; il solver risponde in pochi nodi |
| ✅ **Skin**: una nuova per universo; i suoi 10 stage sbloccano 10 varianti di colore (cambio palette, nessun disegno nuovo) | ricompensa visibile | 40 skin disegnate a mano costerebbero troppo |
| ✅ Etichetta "Difficile"/"Boss" | aspettative | già #73 |
| ❌ **Stelle 1–3** | — | Royal Match non le usa; punteggi alti all'inizio sono legati a meno ritorno; una regola in più da spiegare |

### 4.4 Contenuti (pixel art)
- Si continua a scrivere le immagini a mano nei file `stage-NN.ts`, con i fogli di `npm run preview:levels` (100 livelli fatti così).
- **Regola nuova, dai dati**: dallo stage 3 in poi una figura deve avere **≥ 30% di pixel secondari** (o marrone dall'universo 2), salvo i livelli di respiro; `gen:levels` lo segnala.
- 400 immagini, 400 nomi × 2 lingue, 40 nomi di stage, 4 nomi di universo.

## 5. Paletti etici
Nessuna sconfitta truccata né near-miss pilotato; ogni livello è dimostrato risolvibile dal solver; niente timer che spingono a pagare; ricompense solo estetiche e gratuite; l'aiuto dopo le sconfitte non dipende dalla pubblicità (il "+1 slot" con video di #13 resta un'opzione separata).

## 6. Limiti
- Il giocatore casuale non vede lettura, memoria e tempi di reazione: il secchiello coperto e le tele 16×16 vanno confermati col playtest (#66, #42).
- Il prototipo piazza le meccaniche a caso; nei livelli veri il generatore e la fascia `winRate` le dosano.
- Molte fonti di settore non erano raggiungibili dal proxy: i dati esterni vengono dagli estratti delle ricerche.

## 7. Ticket
Milestone **"500 livelli: 5 universi"**, epic **#87**.

| Ticket | Cosa | Bloccato da |
|---|---|---|
| #88 | Curva 1–500: regole automatiche in `gen:levels` e nei test | #75 |
| #89 | Universo 1: molto facile solo nei primi livelli (55 → ≤ 17) | #88 |
| #90 | Core: universi, progressi, sblocco a fine universo | #74 |
| #91 | UI: selettore, mappa per universo, universi chiusi, festa di fine universo | #90 |
| #92 | Murale dell'universo e skin per universo | #90 |
| #93 | Sconfitta "mancavano N pixel" e aiuto dopo 3 sconfitte | — |
| #94 | Meccanica: marrone | #75 |
| #95 | Meccanica: pietra | #75 |
| #96 | Meccanica: lucchetto e chiave | #75 |
| #97 | Meccanica: secchiello coperto | #75 |
| #98 | Meccanica: pellicola colorata | #75 |
| #99 | Meccanica: corsie cieche | #75 |
| #100 | Universo 2 — Natura (101–200) | #88, #90, #94, #95 |
| #101 | Universo 3 — Viaggio (201–300) | #100, #96, #97 |
| #102 | Universo 4 — Mare e cielo (301–400) | #101, #98, #99 |
| #103 | Universo 5 — Cosmo (401–500) | #102, #93 |

## Fonti
- [Mobile Game Retention Benchmarks 2026 (Segwise)](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies)
- [Rapid Prediction of Player Retention in F2P Mobile Games](https://arxiv.org/pdf/1607.03202)
- [Royal Match: nuovi livelli (Help Center)](https://dreamgames.helpshift.com/hc/en/3-royal-match/section/15-new-levels-1608112030/) · [quanti livelli](https://www.gamerevolution.com/guides/965308-royal-match-how-many-levels-can-you-beat-finish-complete) · [Stars & Tasks](https://royalmatch.fandom.com/wiki/Stars_%26_Tasks)
- [Royal Match: curva di difficoltà e near-loss](https://playliner.com/tpost/l8zzrb9el1-how-difficulty-curve-increases-retention) · [livelli super hard](https://popculturereferences.com/royal-match-is-emulating-candy-crush-saga-in-an-annoying-fashion/) · [Design Deep Dive](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04)
- [Come King definisce un buon livello](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- [Match-3: cadenza degli ostacoli](https://raijinnstudio.com/blog/match-3-game-development-guide-royal-match)
- [CrazyLabs — level design](https://www.crazylabs.com/blog/the-must-have-of-level-design-in-hyper-casual-mobile-games/) · [Tile puzzle level design](https://www.gamedeveloper.com/design/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1)
- [Flow in Games — Jenova Chen](https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf) · [Gamification: goal gradient, Zeigarnik](https://ogamic.com/blog/gamification-behavior-change) · [Persuasive Mobile Game Mechanics](https://www.researchgate.net/publication/336732512_Persuasive_Mobile_Game_Mechanics_For_User_Retention)
- [Dynamic Difficulty Adjustment for Maximized Engagement](https://www.researchgate.net/publication/322414816_Dynamic_Difficulty_Adjustment_for_Maximized_Engagement_in_Digital_Games)
- [Pixel Flow: ostacoli e funzioni](https://pixel-flow.app/wiki/features) · [scheda App Store](https://apps.apple.com/us/app/pixel-flow/id6751056652)
- [Dark pattern nei giochi mobile](https://arxiv.org/pdf/2412.05039) · [Fair Patterns 2025](https://www.fairpatterns.com/post/from-dark-patterns-to-fair-play-why-gaming-must-change-now)
