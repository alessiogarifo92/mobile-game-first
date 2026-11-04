# Playtest agent dell'universo 2: report aggregato (ticket #69)

Data: 31 ottobre – 4 novembre 2026 · Epic #66 · Protocollo: [`docs/playtest/protocollo-agent.md`](../playtest/protocollo-agent.md) (#67) · Harness: [`scripts/playtest/`](../../scripts/playtest/README.md) (#68) · Build: `add72d4` (tag `playtest-u2-add72d4`, variante `normale`) · Schede: [`docs/playtest/sessioni/`](../playtest/sessioni/) · Dati aggregati: [`2026-10-31-playtest-agent.json`](2026-10-31-playtest-agent.json) · Rigenerare: `npx tsx scripts/playtest/aggregate-cli.ts --out docs/reports/2026-10-31-playtest-agent.json docs/playtest/sessioni/T01 docs/playtest/sessioni/T02`

## In breve
- **8 agent-giocatori in 2 turni** (T01: P01–P04, T02: P05–P08), modello sonnet, sul build `add72d4`. Il protocollo ne prevede 16 in 4 turni: il limite d'uso dell'account ne ha permessi 8. T02 è stato interrotto dal limite di 5 ore e ripreso il giorno dopo. Per non rigiocare livelli già visti si è ripartiti dal primo livello mancante (pacchetti `R<da>-<a>`).
- **Copertura: 95 livelli su 106 (95–200)**: 3 livelli visti da 3 agent, 45 da 2, 47 da 1.
  - **Non coperti:** 180 e tutto lo stage 20 (191–200, compreso il boss finale 200).
  - **Requisito del §8 non raggiunto:** nessun livello arriva a 4 agent e la maggior parte non arriva a 3. Quasi tutto il report è quindi **ipotesi**. Fanno eccezione i problemi di UX visti da ≥ 3 agent e due difetti verificati nel codice.
- **Nessun muro all'ingresso dell'universo 2.** 101 e 141 sono stati vinti al primo tentativo da tutti, e S11 ha il 90% di vittorie al primo tentativo. Possibili muri, ciascuno visto da **un solo agent**:
  - **boss 170:** 5 tentativi persi, livello saltato;
  - **179:** abbandono dopo 4 ingorghi di fila;
  - **184:** vinto al 5° tentativo;
  - **97:** abbandono.
- **Il problema principale non è la curva ma la leggibilità degli ingorghi.** 7 agent su 8 non riescono a prevedere quando un secchiello torna con vernice avanzata e riempie gli slot. 20 valutazioni su 73 giudicano l'ingorgo "ingiusto" (≤ 2), e vengono da 7 agent.
- **Bug bloccanti: 0.** Nessun agent ha segnalato un bug con `POST bug`. Due difetti di testo e interfaccia sono confermati nel codice (§5).
- **Due difetti dell'harness**, trovati e corretti durante l'esecuzione (§8).

## 1. Chi ha giocato e cosa
| Sessione | Profilo | Lingua · viewport | Livelli giocati | Esito | Divertimento · "domani lo riaprirei" |
|---|---|---|---|---|---|
| T01-A01 | P01 bambina distratta | IT 360×640 | 95–120 (26) | piano finito, 26/26 | 4 · 4 |
| T01-A02 | P02 pendolare | EN 412×915 | 95–97 (3) | **abbandono al 97** (3 ingorghi di fila) | 3 · 3 |
| T01-A03 | P03 esperto | IT 412×915 | 121–130, 161–168 (18) | 18/18, interrotto al 169 dal limite d'uso | 4 · 4 |
| T01-A04 | P04 impaziente | EN 360×640 | 141–154 (14) | 14/14; 151–154 al posto di 191–200 (difetto dell'harness, §8) | 3 · 3 |
| T02-A05 | P05 non legge | IT 412×915 | 95–110, 131–140 (26) | 26/26 | 4 · 4 |
| T02-A06 | P06 perfezionista | EN 412×915 | 141–160 (20) | 20/20 | 4 · 4 |
| T02-A07 | P07 over 65 | IT 412×915 | 111–120, 171–179 (19) | **abbandono al 179** (4 ingorghi di fila) | 3 · 2 |
| T02-A08 | P08 giocatore di match-3 | EN 360×640 | 161–170, 181–190 (20) | 19/20, **170 saltato** dopo 5 tentativi | 3 · 3 |

**Note sulle schede:**
- **A03:** la scheda di fine sessione è stata raccolta dall'agent dopo lo stop dell'harness (`endReason: errore-harness`).
- **T02:** ogni sessione ha due file. `.parte1.json` è la bozza del primo giorno, con le sole schede di livello. `T02-Ann.json` è la ripresa, con la scheda di sessione.
- **A08 sul 170:** 4 tentativi persi il primo giorno sono nella bozza (`57c603f`) ma non nell'aggregato, che conta solo l'ultimo tentativo e il salto.

## 2. Difficoltà
Per stage (aggregato: `levels[]` del JSON). "1° tentativo" è la quota di livelli vinti al primo tentativo. "Casuale" è `levelWinRate`, la stessa misura del [report della curva](2026-10-31-curva-universo-2.md).

| Stage | Sessioni·livello | 1° tentativo | Difficoltà percepita (1–5) | Capito (1–5) | Casuale | Ingorghi | "+1 slot" |
|---|---|---|---|---|---|---|---|
| 10 (95–100) | 15 | 87% | 2,6 | 3,6 | 59% | 11 | 7 |
| 11 Bosco | 20 | 90% | 2,5 | 3,6 | 79% | 11 | 9 |
| 12 Montagna | 20 | 80% | 3,1 | 3,6 | 75% | 15 | 11 |
| 13 Prato | 10 | 80% | 3,3 | 4,0 | 76% | 8 | 5 |
| 14 Deserto | 10 | 90% | 2,7 | 3,8 | 75% | 5 | 3 |
| 15 Giungla | 20 | 90% | 2,6 | 4,0 | 73% | 11 | 9 |
| 16 Fiume | 14 | 79% | 3,1 | 3,9 | 69% | 16 | 13 |
| 17 Autunno | 18 | 67% | 3,3 | 4,2 | 66% | 23 | 16 |
| 18 Inverno (171–179) | 9 | 89% | 3,3 | 3,6 | 67% | 9 | 6 |
| 19 Notte nel bosco | 10 | 80% | 3,2 | 3,8 | 63% | 16 | 11 |

- **La curva percepita segue quella misurata.** La difficoltà percepita sale da 2,5 (S11) a 3,3 (S17–S18) mentre il tasso casuale scende dal 79% al 63%. Lo stage 17 (marrone + pietra) è il più duro anche per gli agent: 67% di vittorie al primo tentativo e il maggior numero di ingorghi.
- **"+1 slot e continua" è usato molto:** 90 volte su 146 sessioni·livello. Molte vittorie "al primo tentativo" passano da lì (A01 e A03 lo usano sempre, A07 e A08 spesso). Senza, le vittorie al primo tentativo sarebbero meno.
- **Anomalie (§9 del protocollo: percepito ≥ 4 con casuale ≥ 70%):**
  - 128 (82%), 138 (80%), 155 (73%), 156 (77%), 168 (72%), tutti da 1 agent tranne il 168 (2);
  - in tutti la causa scritta nella scheda è un ingorgo da vernice avanzata, non la figura. È lo stesso problema del §3 (F1), non un errore di curva;
  - nessuna anomalia nell'altro verso (percepito ≤ 2 con casuale ≤ 35%).

### Punti chiesti dal report della curva
| Punto | Cosa dicono gli agent | Verdetto |
|---|---|---|
| Boss 160 (40%) | A06: vinto al 1° tentativo con "+1 slot", difficoltà 3 | nessun muro (1 agent) |
| Boss 170 (38%) | A08: 5 tentativi persi in due giorni, saltato, "frustrato", difficoltà 5; A03 non ci è arrivato | **possibile muro**, coerente con il 38% (1 agent) |
| Boss 190 (36%) | A08: vinto al 1° tentativo, difficoltà 3 | nessun muro (1 agent) |
| Boss 200 (34%) | non giocato | **scoperto** |
| Salto 159 → 160 (−22) | A06: 159 difficoltà 2, 160 difficoltà 3, entrambi al 1° tentativo | il salto non si sente (1 agent) |
| Salto 118 → 119 (−20) | A01, A07: 118 difficoltà 3, 119 difficoltà 3,5, entrambi al 1° tentativo | il salto si sente appena (2 agent) |
| Pietre che aiutano (164, 175, 195) | 164: duro per entrambi (difficoltà 4, 0/2 al 1° tentativo, 8 ingorghi da avanzi); 175: vinto al 1° tentativo, "le pietre non le ho capite"; 195 non giocato | nessuno percepisce la pietra come aiuto. Nessuno la percepisce nemmeno come ostacolo: in generale non la vedono (F3) |
| Plateau 12–14 (75/76/75%) | percepito 3,1 / 3,3 / 2,7; S13 è lo stage più lungo (149 s di mediana) | non si sente come piano: S13 sembra più duro, S14 più facile (1–2 agent per stage, debole) |
| Debutti 101 e 141 | 101: A01 e A05 vinto al 1° tentativo, meccanica capita 3/5, giusta 5 e 4; 141: A04 e A06, capita 2 e 3, giusta 4 e 4 | il marrone si impara giocando; la pietra resta poco chiara (F3) |

### Tempi di partita (regola 7 di #88)
Tempo di gioco del tentativo vinto: `ticks` × 85 ms (`TICK_MS`). I tick avanzano anche mentre l'agent guarda lo schermo, e un agent è più lento di un dito, quindi i valori sono un **tetto** sui tempi umani.

- **Mediana per livello: 112 s**, 90° percentile 175 s, su 93 livelli vinti.
- **La durata cresce con i secchielli** (correlazione 0,72 fra numero di secchielli e tick). Il tetto della regola 7, basato sui secchielli, è quindi una misura sensata della lunghezza.
- **I più lunghi:** 189 (226 s, 15 secchielli), 128 (223 s, 22), 190 (219 s, 16), 173 (214 s, 20), 169 (208 s, 16), 110 (203 s, 16).
- **I boss durano 1,1–2,1 volte la mediana del loro stage:** 110 (203 s contro 95), 140 (169 contro 78), 160 (185 contro 103), 190 (219 contro 135). Nessun livello supera i 4 minuti.
- **Proposta:** tenere il tetto attuale. Se lo si vuole tarare sul tempo, un boss al massimo 2× la mediana dello stage, da riverificare con persone vere in #42.

## 3. Giocabilità e chiarezza
Finding = visto da ≥ 3 agent (§7). Gli agent sono contati da `notUnderstood`, `freeText` e scheda di sessione.

| # | Problema | Agent | Esempi (livello: testo della scheda) |
|---|---|---|---|
| F1 | **Vernice avanzata imprevedibile**: il secchiello torna con 1–6 colpi, riempie gli slot e l'ingorgo arriva "dal nulla" | 7: A02, A03, A04, A05, A06, A07, A08 | A04 152: "Another jam out of nowhere"; A08 184: "leftover scraps … sit in my waiting slots forever and kill the run"; A07 179: abbandono |
| F2 | **Tocco su uno slot che non parte**, senza nessun segnale (corsia bloccata) | 5: A03, A04, A05, A06, A08 | A03 121: "il gioco non mi ha detto niente"; A05 140: "rimasti fermi nell'attesa e non partivano" |
| F3 | **Pietre non capite**: stanno ai bordi, non sembrano fare niente | 5: A03, A04, A06, A07, A08 | A03 163: "stanno fuori dal disegno e non le ho mai toccate"; A07 174: "continuo a non sapere che funzione abbiano" |
| F4 | **"+N" sotto le colonne** (secchielli nascosti in coda) non capito | 5: A01, A03, A05, A06, A07 | A01 99: "Cosa vuol dire +2 +1 sotto le colonne?"; A03 127: "l'ho capito solo ora" |
| F5 | **Non si vede quale colore manca** a un pixel mescolato o marrone | 4: A01, A05, A07, A08 | A07 177: "sembravano arancioni finite e invece volevano ancora il blu"; A08 164 |
| F6 | **Ghiaccio non riconosciuto** ("girandola", "snowflake", "cracked cube") anche se la scheda è stata vista nell'universo 1 | 4: A01, A04, A06, A07 | A01 111: "quadratini azzurri con una girandola bianca"; A06 153 |
| F7 | **"+1 slot" solo al primo ingorgo del tentativo**, non detto | 4: A04, A06, A07, A08 | A06 150: "the second one only offered Retry. I did not understand why" |
| F8 | **Pixel "?" (nascosti)**: la rivelazione non si nota | 3: A01, A05, A08 | A08 188: "I never saw one turn into a colour" |
| F9 | **"Nuovo stile dei secchielli"** a fine stage senza effetto visibile e senza indicazione su dove trovarlo | 6: A01, A03, A04, A05, A06, A08 | A01 120: "Non ho visto nessun cambio"; A08 190: "cosmetic" |

**Ipotesi (1–2 agent, senza ticket):**
- l'anteprima della figura non somiglia al disegno finito (A01: 98, 117, 119);
- l'ordine dei colori conta ma non si capisce (A06, A08 in modo esplicito; è legato a F1 e F5);
- un tocco sul quarto slot chiude il pannello "Capolavoro" e porta alla mappa (A03, 166);
- la freccia ◀ toccata per sbaglio a inizio livello costa un tentativo (A04, 153);
- tap sbagliato sulla mappa (A06).

## 4. Coinvolgimento
- **Abbandoni:**
  - P02 pendolare al 97, dopo 3 ingorghi;
  - P07 over 65 al 179, dopo 4 ingorghi. In entrambe le schede la causa sono gli slot pieni di avanzi (F1), non la figura.
  - Non hanno abbandonato i profili più sensibili all'ingresso nell'universo nuovo: P01 bambina, P05 non legge e P09 (non giocato) per scoraggiamento facile.
- **Divertimento medio 3,5/5 e "domani lo riaprirei" 3,4/5** (8 sessioni). Il valore più basso è P07 (3 e 2).
- **Noia:**
  - P08, il giocatore di match-3, scrive di non aver visto "niente di nuovo" da 161 a 190 e chiama la ricompensa "solo una skin". La soglia "2 livelli annoiati di fila" non è scattata.
  - Gli altri profili sono "neutro" o "divertito" sulla maggior parte dei livelli. "Frustrato" compare quasi solo dove c'è un ingorgo.
- **Album, stelle, stage:** le stelle non ci sono (fuori scopo). La ricompensa di fine stage è notata ma delude (F9). Nessun agent ha aperto l'album di sua iniziativa: P10, l'esploratore di menu, non ha giocato.

## 5. Bug
Nessun agent ha usato `POST bug`. Due difetti, segnalati come confusione, sono **verificati nel codice** e quindi confermati senza bisogno di ripeterli (§7: il gioco è deterministico):

| # | Bug | Gravità | Dove | Passi |
|---|---|---|---|---|
| B1 | In italiano la fine di **ogni stage** dice "Mondo completato!", mentre in inglese dice "Stage complete!" e il gioco chiama "universo" il mondo | `sev: media` (testo che confonde stage e universo) | `src/core/i18n.ts:477-478` (`win.stageComplete`, `win.stageCompleteNoSkin`) | IT, vincere il 110 (o un qualsiasi decimo livello) → il pannello dice "Mondo completato! Nuovo stile dei secchielli" (A03 al 130) |
| B2 | Sul livello che chiude uno stage il pannello di vittoria **non mostra le mosse**: il messaggio di stage prende il posto di nome e mosse. Il secondo bottone diventa "Album" invece di "Mappa" | `sev: bassa` | `src/game/scenes/PlayScene.ts:753-754` e 768 | vincere il 160 → solo "Stage complete!", niente "N mosse" (A06; A03 per il bottone) |

**Ipotesi di bug, non riprodotte:**
- sulla mappa a 360×640 l'intestazione dello stage 19 si attacca al contatore ("Night in the woods0/10", A08);
- il tocco sul quarto slot chiude il pannello di vittoria (A03, 166).

Vanno ricontrollate nel prossimo turno, con screenshot.

## 6. Concordanza tra agent
- **Finding (≥ 3 agent):** F1–F9 del §3. F1 è l'unico visto da quasi tutti (7/8).
- **Bug confermati:** B1 e B2, nel codice.
- **Ipotesi (1–2 agent):**
  - tutti i "possibili muri" di difficoltà (170, 179, 184, 97);
  - tutte le anomalie di curva del §2, con un livello per agent: non bastano per un ritocco della curva.
- **Profili d'accordo e in disaccordo:**
  - chi legge (P03, P07) e chi non legge (P04, P05) concordano su F1, F3 e F4: non è un problema di testi saltati;
  - divergono su F5, segnalato dai profili meno esperti, e su F6, segnalato da chi ha saltato le schede ma anche da P07, che le legge tutte.

## 7. Ticket derivati proposti
Figli dell'epic #66. Li apre il manager.

| Titolo proposto | Label | Gravità | Da |
|---|---|---|---|
| Ingorghi da vernice avanzata: rendere prevedibile quanta vernice torna negli slot (anteprima dei colpi o avviso prima dell'ultimo slot) | `ux` | `sev: media` | F1 (7 agent) |
| Secchiello in attesa che non può partire: segnalarlo al tocco e indicare il pixel che blocca la corsia | `ux` | `sev: media` | F2 (5 agent) |
| Pietre poco leggibili: scheda del 141 più chiara e, nei livelli 141–200, pietre dove deviano davvero la vernice (anche 164, 175, 195 del report della curva) | `ux` + `feature` | `sev: media` | F3 (5 agent) |
| Spiegare "+N" sotto le colonne (secchielli in coda) | `ux` | `sev: media` | F4 (5 agent) |
| Mostrare i colori che mancano a un pixel mescolato o marrone | `ux` | `sev: media` | F5 (4 agent) |
| Rendere più riconoscibile il pixel ghiacciato | `ux` | `sev: bassa` | F6 (4 agent) |
| "+1 slot e continua": dire che vale una volta per tentativo | `ux` | `sev: bassa` | F7 (4 agent) |
| Pixel "?": rendere visibile il momento della rivelazione | `ux` | `sev: bassa` | F8 (3 agent) |
| Ricompensa di fine stage: mostrare il nuovo stile o dire dove applicarlo | `ux` | `sev: bassa` | F9 (6 agent) |
| IT: "Mondo completato!" a fine stage → "Stage completato!" | `bug` | `sev: media` | B1 |
| Pannello di vittoria del boss di stage senza numero di mosse | `bug` | `sev: bassa` | B2 |
| Playtest agent: completare la copertura dell'universo 2 (180, 191–200, e 3 agent per livello) prima del rilascio di #100 | `testing` | — | §8 |

Nessun ticket di curva: i possibili muri (170, 179, 184) sono visti da un solo agent. Diventano ticket se il turno di copertura li conferma.

## 8. Limiti
- **Limiti dell'epic #66 e del protocollo §1:**
  - gli agent decidono tra due screenshot, non sotto la pressione di un dito;
  - "divertito / annoiato / frustrato" è un giudizio simulato;
  - la memoria degli agent non è quella di una persona;
  - niente audio né vibrazione;
  - niente ritenzione a giorni.
  Tutto il report è un'ipotesi da confermare con #42.
- **Copertura parziale:** 8 profili su 16 (P09–P16 non hanno giocato), 1–3 agent per livello invece di 3–4, stage 20 e livello 180 scoperti. Il requisito di #100 ("playtest agent sull'universo, nessun muro segnalato") quindi **non è ancora soddisfatto per 180 e 191–200**.
- **Interruzioni:** i limiti d'uso hanno fermato T01 (A03) e T02 a metà. Le riprese sono partite da nuovi salvataggi con lo stesso profilo ma un agent nuovo, informato solo per testo su cosa aveva giocato prima. Le schede di sessione di A03 e T02 descrivono quindi un'esperienza in due tempi.
- **Tempi:** i `ticks` includono il tempo in cui l'agent guarda lo schermo. Sono un tetto, non una misura umana.
- **"+1 slot":** usato da molti profili, rende i tassi al primo tentativo più alti di quelli di chi non lo usa. P16, il prudente che non lo usa mai, non ha giocato.
- **Difetti dell'harness trovati durante l'esecuzione, corretti con test:**
  - **pannello di vittoria e secondo pacchetto (`725ff8e`):** dopo l'ultimo livello di un pacchetto, "avanti" sul pannello di vittoria apriva il livello successivo, e l'harness non caricava il secondo pacchetto (A04 ha giocato 151–154 invece di 191–200). Ora `offPlanStep` lo riporta sul piano;
  - **pacchetti `R<da>-<a>` (`428a94f`):** aggiunti per riprendere un pacchetto a metà, ma lo schema della scheda non li ammetteva. A06, A07 e A08 hanno chiuso con `force=1` e le schede sono state rivalidate con lo schema corretto (0 errori).

## 9. Cosa resta per #42 (persone vere)
- **Ingorghi (F1 e F7):** se gli ingorghi da avanzi sono frustranti anche col dito o se sono parte del gioco. È la decisione più importante: gli agent la segnalano quasi all'unanimità, ma un agent pianifica peggio, o diversamente, di una persona.
- **Muri di difficoltà:** se 170, 179 e 184 sono muri anche per persone, e il boss 200, che nessun agent ha giocato.
- **Pietre (F3):** se le persone le notano e se capiscono la scheda del 141.
- **Durate:** i tempi di partita veri (mediana per livello e per boss), per fissare il tetto della regola 7.
- **Plateau 12–14:** se si sente come piano o come respiro prima della pietra.
- **Album e ricompense (F9):** se l'album e il nuovo stile motivano a continuare.
