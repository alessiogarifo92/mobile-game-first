# Modello della difficoltà per livello e per stage — raccomandazione

Data: 17 novembre 2026 · Ticket: #71 (research) · Epic: #70 · Implementazione: #72 · UI: #73 · Vincolo: #75 · Curva: #88 / epic #87

Questo report chiude le sei domande di #71. Non cambia codice né altri ticket: la sezione 9 propone gli aggiornamenti di #72 e #73. Dove la scelta spetta all'utente (sezione 7) ci sono opzioni con pro e contro e una raccomandazione.

## 1. Sintesi

| Domanda | Raccomandazione |
|---|---|
| 1. Cosa si etichetta | **Ogni livello**: 3 fasce **Facile / Normale / Difficile**. **Boss non è una fascia ma un indicatore di posizione** (il boss resta Facile/Normale/Difficile dentro, e si vede "Boss"). **Ogni stage**: un valore numerico (media) e, derivata, la stessa fascia; la UI dello stage è una scelta dell'utente (§7). |
| 2. Da dove viene | **Ibrido, già deciso da #75/#71**: etichetta = funzione di `levelWinRate` (nessuna seconda formula). Override solo dichiarato nella spec, con motivo, per le eccezioni. |
| 3. Soglie assolute | **Facile ≥ 85% · Normale 65–85% · Difficile < 65%** di vittorie casuali. Sotto-fascia interna "molto facile" ≥ 95% (già `CURVE.veryEasy`). Le soglie **non si spostano** quando arrivano livelli nuovi: se serviranno livelli più duri si **aggiunge una fascia in fondo** (es. "Estremo" < 30%), non si sposta nulla. |
| 4. Stage | **Media** di `levelWinRate` di tutti i 10 livelli (boss compreso) = unico valore numerico, lo stesso che usa `CURVE`. Stage incompleto: **nessun valore** (come #88). Livelli aggiunti dopo: il valore dello stage si ricalcola e il cambio è visibile nel diff (§5). |
| 5. Mostrarla? | **Decisione dell'utente.** Raccomando l'opzione B: mostrare solo **"Difficile" e "Boss"**, mai "Facile"/"Normale", e niente etichetta sullo stage (§7). |
| 6. Dente di sega | L'etichetta lo rappresenta da sola, senza eccezioni a mano (§6). |
| Vincolo #75 | `beltCapacity` e `slots` entrano **solo** attraverso `levelWinRate`, insieme, con le regole di `sim.ts`. Misurato: abbassarli non rende mai più facile e sposta l'etichetta (§8). |

## 2. Dati di partenza (misurati oggi)

Misura: `levelWinRate` (`src/core/solver.ts`): 200 partite casuali con le regole vere di `sim.ts`, seed = id del livello, quindi deterministica. Errore standard a 200 partite: ±3,4 punti al 65%, ±2,5 al 85%.

Comando (su `main` a `2fa549d`, 220 livelli, 5 s totali):

```
npx tsx <script che mappa levels.json con parseLevel + levelWinRate>
```

(Stessa chiamata di `scripts/difficulty-report.ts`; ho usato uno script usa-e-getta non committato per ottenere solo la tabella grezza senza rigenerare grafico e JSON.)

| Dato | Valore |
|---|---|
| Livelli | 220 (universi 1–2 completi, universo 3 stage 21–22) |
| Percentili del win rate | min 33% · p10 56% · p25 64% · mediana 74% · p75 83% · p90 92% · max 100% |
| Livelli sotto il 35% / sotto il 30% | 1 (il 200) / 0 |
| Livelli entro ±3 punti da una soglia (85% o 65%) | 49 su 220 |
| Fasce di spec `winRate` che **attraversano** una soglia | 81 su 217 (molte sono ampie, es. `[0.5, 1]`) |

Medie per stage (tutti i livelli): stage 1–4 tra 97% e 85%; 5–8 tra 79% e 68%; 9–10 65%; universo 2: 79% (stage 11) → 61% (stage 20); universo 3 (parziale): 74% e 69%. Boss: 76% (stage 1) → 33% (stage 20) → 37% (stage 22).

Dati di percezione (playtest agent, `2026-10-31-playtest-agent.md`, §2): la difficoltà percepita sale da 2,5 (stage 11, 79%) a 3,3 (stage 17–18, 66–67%). Il punto "percepito ≈ 3" cade intorno al 70%; "percepito ≥ 3,2" a ≤ 66%. Le 5 anomalie (percepito ≥ 4 con casuale ≥ 70%: livelli 128, 138, 155, 156, 168) sono tutte ingorghi da vernice avanzata, un limite noto della misura; **nessuna anomalia nell'altro verso** (percepito ≤ 2 con casuale ≤ 35%). Cioè "Difficile" raramente è sbagliata, "Normale/Facile" a volte sì. Il campione è piccolo (1–2 agent per livello): è un'ipotesi, non una prova.

## 3. Domanda 3 — soglie (assolute) e come ricalibrarle

### 3.1 Soglie proposte

| Fascia | `levelWinRate` | Note |
|---|---|---|
| Facile | ≥ 0,85 | include la sotto-fascia interna "molto facile" ≥ 0,95 (`CURVE.veryEasy`), non mostrata |
| Normale | da 0,65 (incluso) a 0,85 (escluso) | |
| Difficile | < 0,65 | |
| Boss | non è una fascia: è `level.boss` | si mostra "Boss" al posto/accanto alla fascia |

Una sola tabella (es. `DIFFICULTY.bands` accanto a `CURVE`), con un campo `version`.

### 3.2 Perché queste soglie: quattro set confrontati sui livelli esistenti

Quota di livelli non-boss per fascia (stesse 220 misure):

| Set (Facile / Normale) | Univ. 1 F/N/D | Univ. 2 F/N/D | Univ. 3 F/N/D | Entro ±3 pt da una soglia |
|---|---|---|---|---|
| **A: 85 / 65** | 48 / 32 / 20 | 8 / 72 / 20 | 6 / 83 / 11 | 49 |
| B: 80 / 60 | 58 / 33 / 9 | 27 / 69 / 4 | 17 / 78 / 6 | 56 |
| C: 85 / 60 | 48 / 43 / 9 | 8 / 88 / 4 | 6 / 89 / 6 | 44 |
| D: 90 / 70 | 32 / 41 / 27 | 2 / 60 / 38 | 6 / 78 / 17 | 53 |

- **B e C** lasciano troppo poco "Difficile" (4–9% nell'universo 2): l'etichetta non direbbe quasi nulla, e i playtest mettono già a ~3,3 percepito livelli al 66%.
- **D** si avvicina di più ai mix provvisori di #87 (universo 1: Facile+molto facile 32%) ma chiama "Difficile" il 38% dell'universo 2, cioè livelli al 65–70% che gli agent giudicano ~3.
- **A** taglia dove la percezione passa da ~2,5 a ~3,3 (65–70%) e lascia nell'universo 2 un mix 8/72/20.
- Il mix dell'universo 1 sotto A (48% Facile) è ancora "troppo facile" rispetto a #87: **non è un problema delle soglie ma del contenuto**, e lo sistema #89 (55 → ≤ 17 livelli "molto facili"). Il controllo del mix per universo di #87 (§4.2 del report 500 livelli) va ricalcolato con queste soglie: Facile = molto facile + facile.

Raccomando **A**. Rischio: i mix di #87 vanno riletti con le soglie vere (nessun mix è ancora in CI). Se l'utente preferisce D, la scelta è una riga nella tabella.

### 3.3 Regola per non rompere le etichette già mostrate

1. Le soglie sono **assolute e congelate**: nessun livello nuovo le sposta, mai. Un livello nuovo e più duro non cambia le etichette dei vecchi (ogni etichetta dipende solo dalla misura di quel livello).
2. Il lato aperto è **sotto**: i livelli più duri dei piani (boss target ≥ 25% / 22% / 20% negli universi 3–5) possono richiedere una fascia sotto "Difficile". Si **aggiunge** (es. "Estremo" < 30%) e nessuna delle tre esistenti cambia. Oggi nessun livello è sotto il 30%: non va introdotta prima.
3. Le etichette si **memorizzano** (campo in `levels.json` o file affiancato) e `gen:levels --check` fallisce se l'etichetta ricalcolata è diversa da quella salvata. Così ogni cambio di etichetta è un diff in PR, mai silenzioso.
4. Si cambiano soglie o misura **solo** con evidenza esplicita: (a) la misura cambia (come #75: playouts, regole di `sim.ts`), oppure (b) i playtest (#42, #66) mostrano che un'etichetta mente. In entrambi i casi: `DIFFICULTY.version` +1, una tabella "livelli che cambiano fascia" nel report della PR, e l'utente decide.
5. **Rumore**: a 200 partite l'errore è ±3 punti, quindi un livello rigenerato può passare una soglia per caso. Mitigazione: le fasce `winRate` delle spec **non attraversano una soglia** (oggi 81 su 217 lo fanno) oppure il livello dichiara il suo `difficulty` atteso; CI segnala i livelli entro la tolleranza di 3 punti (`CURVE.tolerance`) da una soglia come "al limite" (informativo, non bloccante).

## 4. Domande 1, 2 e 4 — cosa si etichetta, da dove viene, stage

### 4.1 Livello
Funzione unica (pura, in `src/core`): `levelWinRate` → fascia. Niente seconda formula. Le metriche della domanda 2 (n. secchielli, tela, ghiaccio, nascosti, slot, nastro) **non sono dati di ingresso aggiuntivi**: stanno dentro `levelWinRate` dove contano davvero (nastro e slot via `sim.ts`; ghiaccio e nascosti tramite le regole; la pietra c'è, verificata da #147/#100). Sommare colonne diverse a mano sarebbe una seconda formula con pesi inventati.

Ibrido: **derivato**, con override opzionale `curve.difficulty` nella spec, ammesso solo con una stringa di motivo (stesso schema di `easyBoss`) e riportato in CI. L'override cambia l'etichetta mostrata, non la misura. Pro del derivato: scala da solo con i livelli nuovi, una sola definizione, riproducibile. Contro: non vede tempo di lettura e durata (limite di #29), né l'ingorgo da vernice avanzata (5 anomalie sopra); i playtest correggono con un override dichiarato, non con una formula più complicata.

### 4.2 Stage: media, massimo o curva?

| Aggregato | Stage 9 | Stage 10 | Giudizio |
|---|---|---|---|
| Media di tutti i 10 livelli | 0,645 → Difficile | 0,653 → Normale | scelta, ma **a un soffio dalla soglia** |
| Media dei non-boss | 0,67 N | 0,68 N | nasconde il boss, che fa parte dello stage |
| Mediana dei non-boss | 0,62 D | 0,61 D | più stabile, ma dipende dal n. di livelli |
| Minimo (il più duro) | Difficile in 15 stage su 17 dal 6 in poi | | non discrimina: dice quasi sempre "Difficile" |

Raccomando la **media di tutti i livelli** come valore numerico dello stage, perché è già ciò che usano le regole di curva di #88 (`stageMean`) e non dipende dalle posizioni 1..10. Con le soglie A le fasce degli stage sono: **Facile** 1–4; **Normale** 5–8, 10–18, 21–22; **Difficile** 9, 19, 20 (e il 9 contro il 10 si decide per 0,8 punti).

Due conseguenze oneste:
- Con soglie assolute **15 stage su 22 sono "Normale"**: l'etichetta di stage ha poca risoluzione, perché la curva del gioco vive tra 60% e 80%. Il valore numerico è più informativo dell'etichetta; per questo la UI dello stage è una scelta dell'utente (§7).
- Il numero di livelli "Difficile" dello stage (0–7 su 10) discrimina meglio dell'etichetta: stage 5: 0; stage 9: 7; stage 20: 6. È una scelta di presentazione, non di modello.

**Stage incompleto (`complete: false`)**: nessun valore e nessuna etichetta (le regole di #88 già saltano gli stage incompleti). Le etichette dei suoi livelli esistono e si possono mostrare.
**Livelli aggiunti dopo**: i livelli già etichettati non cambiano. Se lo stage è già completo e cambia il suo insieme di livelli, il valore dello stage si ricalcola e la differenza compare nel diff (§3.3.3).

## 5. Scalabilità (N stage, N livelli per stage)

Il modello non usa mai 10 né 100: la fascia di un livello dipende solo da quel livello; il valore di uno stage è una media su "i livelli dello stage". Le uniche dipendenze da numeri fissi restano quelle già in `CURVE` (posizioni 1–10 della curva a dente di sega, `LEVELS_PER_STAGE`): non sono dell'etichetta ma delle regole di curva di #88. #72 non deve aggiungerne di nuove.

## 6. Domanda 6 — dente di sega

Distribuzione delle fasce per posizione nello stage (soglie A, tutti i 220 livelli):

| Pos. | Facile | Normale | Difficile |
|---|---|---|---|
| 1 (respiro) | 17 | 5 | 0 |
| 2–3 | 14 | 27 | 3 |
| 4 (base+1) | 3 | 13 | 6 |
| 5–6 | 8 | 31 | 5 |
| 7 (base+1) | 4 | 12 | 6 |
| 8 | 4 | 14 | 4 |
| 9 (duro "travestito") | 1 | 7 | 14 |
| 10 (boss) | 0 | 3 | 19 |

L'etichetta **rappresenta** il dente di sega: il respiro è quasi sempre Facile, i duri e i boss quasi sempre Difficile, il resto Normale. Un livello di respiro non appare "incoerente" perché la fascia è il suo valore vero, non una media. Eccezioni da dichiarare, non nascondere: il boss facile dichiarato (`easyBoss`, es. il Faro) resta Normale con indicatore "Boss": è corretto e coerente con la regola "il boss è il più duro salvo eccezioni dichiarate". Il boss dello stage 1 vale 76% (Normale), come previsto.

## 7. Domanda 5 — mostrarla al giocatore? (decisione dell'utente)

Precedente già nel progetto: il report dei 500 livelli (`2026-10-05-500-livelli-universi.md`, §4.3) ha messo "✅ Etichetta Difficile/Boss" tra le decisioni, ma #71 la lasciava aperta: questa sezione la chiude con tre opzioni.

Ricerca esterna (secondaria, non ho potuto verificare le schermate): Royal Match e Candy Crush **segnalano solo i livelli duri** con un'icona "Hard"/"Super Hard" accanto al livello, non etichettano i livelli facili; le recensioni notano che l'etichetta a volte non coincide con la difficoltà reale. Fonti: [Royal Match, analisi dei livelli e della difficoltà (Medium)](https://medium.com/@ekinmelissezer/game-analysis-for-royal-match-and-toon-blast-9c4bff8ef48b) · [Royal Match, "suddenly got much harder" (Şikayetvar, recensioni)](https://www.sikayetvar.com/en/royal-match-us/royal-match-suddenly-got-much-harder-overnight-is-this-normal-or-tied-to-player-behavior-q-33662) · [Candy Crush Wiki, "Hard level locked"](https://candycrush.fandom.com/wiki/File:Hard_level_locked.png) · Royal Match "Hard/Super Hard" e "duro travestito" già citati in `2026-10-05-500-livelli-universi.md` §3.

| Opzione | Cosa si vede | Pro | Contro |
|---|---|---|---|
| **A. Solo interno** | niente in UI; pipeline, report, ordinamento e tuning | zero rischio di scoraggiare; nessuna UI da fare; #73 si chiude come non pianificato | nessun beneficio al giocatore; il boss resta l'unico segnale |
| **B. Solo i segnali alti (raccomandata)** | badge "Difficile" e "Boss" su nodi livello e pre-livello; nessun "Facile"/"Normale"; nessuna etichetta sullo stage (o solo "n livelli difficili") | come Royal Match/Candy Crush; la fascia "Difficile" è la più affidabile nei playtest (nessuna anomalia inversa); chi perde un Difficile ha già l'avviso ("è ok sbagliare"); pochi nodi marcati, poco carico sullo scroll | "Normale" a volte sembra difficile (le 5 anomalie): l'assenza di badge può far sentire "sbagliato" chi perde; un'etichetta in meno su cui si può discutere |
| **C. Etichetta piena** | Facile / Normale / Difficile su ogni livello e ogni stage; Boss | massima informazione; coerente con "scelta di cosa giocare" | rischio più alto di "Facile" che scoraggia chi perde; l'etichetta di stage è quasi sempre "Normale" (15/22); più testi IT/EN, più spazio su schermi piccoli (#50) |

Raccomando **B**: coincide con la decisione già presa in #87 ("Difficile/Boss"), protegge dalle fasce meno affidabili, costa poco in UI. Il modello interno non cambia tra A, B e C: in tutti e tre le fasce esistono in `core` e nei report.

## 8. Vincolo #75: nastro e slot valutati insieme

**Come entra nel modello:** `levelWinRate` simula `canBoard`, `boardGap`, ritorno negli slot e ingorgo con `sim.ts`. L'etichetta è una funzione di quel numero e di nient'altro. Quindi nastro e slot sono valutati insieme dalla stessa simulazione e non esiste una seconda formula. #72 non deve usare `belt`/`slots` come colonne separate.

**Verifica nuova** (1000 partite, seed = id, tutti i 220 livelli, 6 varianti: base, nastro −1, slot −1, entrambi −1, nastro +1, slot +1; script usa-e-getta, non committato, ~154 s):

| Variante | Calo medio di vittorie | Livelli *più facili* di oltre 3 pt | Livelli che cambiano fascia (tutti verso Difficile) |
|---|---|---|---|
| nastro −1 | −25,9 pt | **0** | 134 |
| slot −1 | −47,0 pt | **0** | 148 |
| nastro −1 e slot −1 | −59,0 pt | **0** | 149 |
| nastro +1 | +13,5 pt | 0 (nessun livello più difficile di 3 pt) | 131 |
| slot +1 | +21,2 pt | 0 (idem) | 167 |

Calo medio con nastro −1, slot −1, entrambi −1, per stage (punti): stage 1: 3/9/12 · stage 3: 18/39/65 · stage 8: 27/48/55 · stage 12: 33/61/70 · stage 22: 34/58/66. Si conferma "le due leve si sommano" di #75 (la somma è meno che lineare).

Conseguenze per i test di #72:
- Monotonia (≥ 3 pt di tolleranza per il rumore): abbassare nastro o slot non rende mai il livello più facile, e alzarli non lo rende più difficile: 0 violazioni su 220 livelli.
- Cambiare solo nastro, o solo slot, **cambia** l'etichetta in 134 e 148 livelli su 220: il test "una leva sola può cambiare la fascia" è soddisfatto da dati veri.
- Il test va scritto sulla **misura** (win rate, con tolleranza) e poi sull'etichetta; confrontare solo etichette a 200 partite sarebbe fragile.
- Controllo CI "nastro e slot più generosi verso il boss": va sul win rate e su `beltCapacity`/`slots` dichiarati, non su una nuova formula.

Nota: i miei esperimenti usano 1000 partite per ridurre il rumore; i valori in `levels.json` restano a 200 (`WIN_RATE_PLAYOUTS`).

## 9. Aggiornamenti proposti a #72 e #73 (non applicati)

### #72 — calcolo in core, pipeline, report
- **Modulo** `src/core/difficulty.ts`: `DIFFICULTY = { version: 1, bands: [{ name: 'easy', min: 0.85 }, { name: 'normal', min: 0.65 }, { name: 'hard', min: 0 }] }` e `levelDifficulty(winRate, level)` che prende **il win rate** (e `boss`), non ricalcola nulla; `stageDifficulty(levels)` = media dei win rate, `undefined` se lo stage non è completo. Sotto-fascia interna `veryEasy` = `CURVE.veryEasy`.
- **Boss** = flag, non fascia: `{ band, boss: boolean }`.
- **Override** `curve.difficulty?: { band; why: string }` accanto a `easyBoss`; riportato in CI.
- **Pipeline**: `levels.json` (o file affiancato) salva `winRate` e `difficulty` per livello; `gen:levels --check` fallisce se la fascia salvata è diversa da quella ricalcolata; la tabella "livelli che cambiano fascia" è nell'output (per le PR che cambiano `DIFFICULTY.version`).
- **Report**: `difficulty-report.ts` stampa fascia per livello e per stage dalla stessa funzione; i mix per universo di #87 si confrontano con queste fasce.
- **CI**: segnalare (informativo) i livelli entro 3 punti da una soglia e le fasce `winRate` di spec che attraversano una soglia (81 oggi); errore se l'etichetta calcolata contraddice l'override dichiarato.
- **Test** (aggiungere a quelli già elencati): boundary esatti 0,85 / 0,65 (inclusivi/esclusivi come in §3.1); aggiungere un livello più duro non cambia le etichette dei vecchi; monotonia su nastro e slot sul win rate (§8); stage incompleto → `undefined`; versione della tabella nel file salvato.
- **Fuori ambito**: nessuna nuova metrica composta; nessuna soglia nel codice fuori dalla tabella.

### #73 — UI (condizionata alla scelta dell'utente in §7)
- **Se A**: chiudere come non pianificato.
- **Se B (raccomandata)**: "Da fare" ridotto a badge **Difficile** e **Boss** sui nodi livello e nel pre-livello (nessun testo per Facile/Normale); stage header: niente etichetta, al massimo "n difficili"; testi IT/EN solo per Difficile e Boss; informazione non solo colore (forma + testo); niente draw call extra per nodo.
- **Se C**: come oggi, più avviso che l'etichetta di stage ha poca risoluzione (15/22 Normale) e va mostrata insieme al numero di livelli Difficili.
- In tutti i casi: il testo del badge non attribuisce colpa ("Difficile" descrive il livello, non il giocatore); nel pannello d'ingorgo non ripetere l'etichetta.

## 10. Limiti
- Il giocatore casuale non vede lettura, tempi e memoria; le 5 anomalie di §2 sono ingorghi da vernice avanzata che la misura sottostima.
- I dati di percezione sono di agent (1–2 per livello), non di persone (#42 aperto): le soglie 85/65 sono ragionevoli, non provate. La prima ricalibrazione legittima (§3.3.4) è dopo i dati di #42.
- Le fonti esterne sono secondarie (wiki, recensioni, analisi); non ho potuto verificare le schermate dei giochi citati.
- Il misuratore usa-e-getta non è committato; per riprodurre §8 basta `randomWinRate({...level, beltCapacity, slots}, 1000, createRng(level.id))` su ogni livello di `levels.json`.
