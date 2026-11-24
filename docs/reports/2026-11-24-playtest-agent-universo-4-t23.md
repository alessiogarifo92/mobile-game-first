# Playtest agent dell'universo 4: turno T23

Data: 24 novembre 2026 · Epic #66 e #102 · Domande di partenza: [curva dell'universo 4](2026-11-24-curva-universo-4.md) · Schede: [`docs/playtest/sessioni/T23/`](../playtest/sessioni/T23/) · Build: `472973c` (tag `playtest-u4-1`, variante `normale`) · Configurazione: `scripts/playtest/turn-23.json`

## In breve
- **3 agent sonnet, 1 pacchetto ciascuno**: A07 (P07, over 65 alle prime armi, IT) su S31 (301–310), A03 (P03, puzzle-fan, IT) su S35 (341–350), A11 (P11, giocatore della sera, EN) su S40 (391–400).
- **30 livelli, 30 vinti al 1° tentativo, 0 saltati, 0 abbandoni.** 5 ingorghi (302, 343, 346, 349, 395), tutti risolti con "+1 slot". 0 rifiuti per nastro pieno.
- **Le novità si capiscono, ma le card arrivano dopo l'elemento sul tabellone**: tutti e 3 gli agent, in lingue e profili diversi, lo dicono (§2). È il problema che T20 aveva trovato per "Perché è tornato" e che #225 ha risolto solo per quella card.
- **Difficoltà percepita bassa**: 2–4 su 5 (mediana 3). I boss (310, 350, 400) non sono sembrati più duri dei livelli vicini; il 400 ha `randomWin` 0,22 (il più basso) ma capito 5 e difficoltà 2: il finale non ha tensione (§3).
- **Difetto dello strumento trovato e corretto**: lo schema delle schede non conosceva le card `film` e `tunnel`, quindi `end` rifiutava le schede di tutti e 3 gli agent (§5).

## 1. Chi ha giocato
| Sessione | Profilo | Lingua · viewport | Livelli | Esito | Divertimento · "riaprirei" |
|---|---|---|---|---|---|
| T23-A07 | P07 | IT 412×915 | 301–310 | piano finito, 10/10 al 1° | 3 · 3 ("un po' stanca: livelli lunghi") |
| T23-A03 | P03 | IT 412×915 | 341–350 | piano finito, 10/10 al 1° | 3 · 4 |
| T23-A11 | P11 | EN 412×915 | 391–400 | piano finito, 10/10 al 1° | 4 · 4 |

Senza `seenCards`: ogni agent parte dal salvataggio di un giocatore che ha completato i livelli prima del suo pacchetto, con una card di inizio livello vista per livello, come nel gioco.

## 2. Le card arrivano dopo l'elemento (3 agent su 3)
| Elemento già visibile | Card | Agent |
|---|---|---|
| marrone (302) | 303 | A07 |
| marrone (341) | 342 | A03 |
| pellicola (342) | 344 | A03 |
| pietre (343) | 345 | A03 |
| coperti "?" (344) | 346 | A03 |
| "+1/+2" sotto le colonne (341) | 348 | A03 |
| "+1" sotto le colonne (prima) | 309 | A07 |
| ↩ e "!" (342) | "Perché è tornato" 347 | A03 |
| lucchetti e chiavi (391) | 396 | A11 |
| coperti (393) | 397 | A11 |
| "+3" sotto le colonne (393) | 398 | A11 |
| ↩ (391) | "Perché è tornato" 399 | A11 |

- Le card di inizio livello seguono la regola "una per livello": la coda delle novità di uno stage si distribuisce su più livelli, mentre l'elemento è già sul tabellone. #225 ha anticipato solo la card "Perché è tornato" (§1 di T22), e qui compare ancora in ritardo (A03 al 347, A11 al 399).
- **Card già viste che ricompaiono** (A03: "Mescola sulla tela" al 341; A11: "Mescola" e "Marrone" al 391–392): da capire se è la coda del salvataggio dell'agent o un difetto del gioco. Va verificato prima di aprire un ticket.
- **Le novità dell'universo**: "pellicola" è spiegata ma "non dice che sotto c'è un altro colore" (A07, 301); il secchiello bloccato da una pellicola non dà nessun messaggio (A07). "Galleria sul nastro": la card è chiara (A03, A11) ma in partita "non si nota che cambi qualcosa" (A03 343, A11 394, 398–400). Lucchetti, chiavi e pietre: "non ho visto cosa cambiassero" (A11 392, 395, 396).
- Testo: la card pellicola ha un a capo spezzato male ("solo un colpo del / suo colore la strappa", A03).

## 3. Le domande della curva
| Domanda (report della curva) | Risposta |
|---|---|
| Film (301) e gallerie (341) sono spiegati? | **Solo a metà**: le card si capiscono, ma l'effetto in partita non si vede (§2). |
| 342 è un muro? | **No, ma è un salto**: A03 lo vince al 1° tentativo, difficoltà 4, "solo 2 slot e tantissimi marroni"; gli ingorghi arrivano a 343, 346, 349. `randomWin` 0,605 dopo l'1,0 del 341. |
| La combinazione 379–400 è leggibile? | A11 vince tutto al 1° tentativo; 395 (ingorgo, errore suo: due slot pieni) e **397** (puzzle d'ordine invisibile in anticipo: tre secchielli in cima restituiscono 9–10 vernici mentre il rosso serve sotto; ne è uscito lanciando un secchiello piccolo in uno slot) sono i punti più duri. |
| Il boss 400 è difficile ma giusto? | **Giusto, non difficile**: 21 mosse, difficoltà 2, capito 5, `randomWin` 0,22 ("piu-facile-del-previsto"). La schermata finale ("Universo completo", tramonto con barca a vela, "Nuovo stile di secchielli!", "Un nuovo universo sta arrivando") è piaciuta. Anche 310 (difficoltà 4) e 350 (3) non sono sembrati più duri dei vicini ad A03 e A07. |

Altri dati: difficoltà percepita A07 2–4, A03 2–4, A11 2–3; tempi di vittoria 102–249 s; il livello 302 è segnalato "più duro del previsto" (`randomWin` 0,715, ingorgo, difficoltà 4, molti marroni e due soli slot) e il 348 (forziere, quasi tutto marrone) è "ripetitivo, noioso" (A03). A07 trova i livelli dal 304 al 310 "lunghi e pesanti: tanti secchielli grossi da rilanciare dagli slot".

## 4. Altri problemi
- **Mappa**: l'etichetta dello stage 40 copre il cerchio del livello 391 (A11-B01).
- **Messaggi in alto**: cambiano a ogni lancio ("Rilancia prima quello senza ↩", "Tutti tornano: se si blocca, +1 slot"), compaiono e spariscono prima di essere letti (A07), e il loro senso "si impara a forza di provare".
- **Ingorghi**: A03 e A07 non capiscono perché la vernice resta bloccata (un pixel di un altro colore non ancora finito); A03 ha avuto un ingorgo con tre secchielli minuscoli prima di poterli lanciare (349).
- **Disegni**: A03 non riconosce 343 ("Bordata"); A11 non riconosce 392 e non nota il capitano di 350 se non alla fine.

## 5. Strumento: schema delle schede
`docs/playtest/scheda.schema.json` elencava 13 id di card in `tipId` e 10 meccaniche in `mechanic`, senza `film` e `tunnel`. Gli agent hanno rispettato la regola (nessuna chiusura forzata); le tre schede sono state chiuse con `force` dal manager, poi convalidate con lo schema corretto (id aggiunti anche a `mechanic`) e ri-nominate. Un test unit in `tests/playtest.test.ts` fallisce ora se una card del gioco manca nello schema.
- **Attenzione ai dati**: in A07 al 301 e in A11 al 393 la card mostrata è `film`, ma la valutazione `mechanic.id` dice `covered`: l'agent non poteva scrivere `film` perché il validatore lo rifiutava. Le valutazioni `covered` di quei due livelli vanno lette come "pellicola".
- `levelFeedback.mechanic` cita nella descrizione solo i debutti fino al 241: da aggiornare in una modifica dello schema più ampia.

## 6. Limiti
- **1 agent per livello**: nessuna conferma incrociata sulla difficoltà di un livello; solo i problemi di coda delle card (§2) sono confermati da 3 agent su 3.
- Nessun giocatore impaziente (P05) né mobile piccolo: tutti viewport 412×915.
- Le sessioni leggono gli screenshot a distanza di azioni: i tempi sono un tetto.
- La copertura dell'universo 4 non è un obiettivo dell'aggregatore: restano 106 livelli (95–200) senza agent.

## 7. Cosa fare
1. **Verificare in codice** perché le card di inizio livello arrivano dopo l'elemento (`tipOnLevelStart`, `tipsAnticipated`, `tipsPresent` in `src/core/onboarding.ts`) e perché "Mescola" e "Marrone" ricompaiono: 3 agent su 3 concordi, vale un ticket se si conferma che è del gioco e non del salvataggio dell'agent.
2. **Decisione di design (utente)**: i boss non danno tensione (A03, A11: "non più duri dei livelli vicini"); se è voluto per l'universo 4, `#102` può chiudersi; altrimenti serve una passata sulla curva dei boss.
3. Segnali in partita per le novità che "non si notano" (galleria, pellicola, lucchetti, pietre): ipotesi con 1–2 agent, non ancora ticket.
4. Mappa: etichetta dello stage 40 sul livello 391 (1 agent, bug minore).
