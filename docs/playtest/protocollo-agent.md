# Playtest agent: protocollo, profili e scheda di feedback (#67)

Data: 30 ottobre 2026 · Epic #66 · Harness: #68 · Esecuzione e report: #69 · Scheda: [`scheda.schema.json`](scheda.schema.json) (JSON Schema 2020-12), esempio [`scheda.esempio.json`](scheda.esempio.json) (dati inventati)

Questo documento dice **chi** gioca, **cosa** gioca, **come** e **cosa riporta**, così che le sessioni siano confrontabili tra agent, tra turni e tra universi. Non contiene codice di gioco.

## 1. Cosa misura e cosa no
Gli agent trovano bug, testi poco chiari, punti dove non si capisce cosa fare e anomalie della curva (un livello molto più duro o più facile dei vicini). Gli agent giocano da **giocatori**, non da tester: niente codice, niente report di difficoltà.

**Non possono giudicare** (va scritto nel report di #69 e verificato con persone vere in #42):
- il tatto e il ritmo di un dito su un telefono: l'agent decide tra due screenshot, non sotto pressione;
- il divertimento vero: "divertito / annoiato / frustrato" è un giudizio simulato, un'ipotesi;
- la memoria a breve termine di un umano (conta per il secchiello coperto, vedi §8): un agent può ricordare troppo bene o troppo male;
- audio e vibrazione;
- la ritenzione a giorni (D1/D7): resta ad analytics (#14).

## 2. Lo stato del gioco su cui gira
- **Universi da 100 livelli**, stage da 10, il 10° di ogni stage è il boss. L'universo 2 (Natura, 101–200) si apre solo dopo il livello 100.
- **Meccaniche e debutti**: ghiaccio 31, nascosti 51 (universo 1) · **marrone 101**, **pietra 141**, combinazione marrone + pietra 161 (universo 2) · **lucchetto e chiave 201**, **secchiello coperto 241** (universo 3). Ogni debutto mostra una scheda di suggerimento una tantum (`tip.*`).
- **"+1 slot e continua"**: esiste, è gratuito e compare sul pannello di ingorgo una volta per tentativo (`continueWithExtraSlot`). Si misura (`extraSlotUsed`). Non dipende dalla pubblicità: il rewarded ad (#13) non è fatto, quindi niente domande su pubblicità.
- **Stelle: non applicabile.** Le stelle 1–3 sono fuori scopo per #87; nessuna domanda o profilo ruota intorno alle stelle. Il "perfezionista" punta al numero di mosse, che il pannello di vittoria mostra.
- **Aiuto dopo 3 sconfitte e "mancavano N pixel" (#93)**: non ancora nel gioco. La telemetria registra già `targets − painted`, così il dato c'è quando #93 arriva.

## 3. Regole contro il bias
1. L'agent vede **solo** ciò che vede un giocatore: screenshot e testi a schermo. Non legge `src/`, `scripts/`, `docs/reports/`, `docs/levels/`, né questo protocollo oltre al proprio profilo e al §5 (cosa riportare).
2. `window.__mix` lo legge **l'harness** per la telemetria e per tradurre i tap; l'agent non lo riceve mai, nemmeno in parte (niente `solution`, `queueColors`, `columns` come aiuto).
3. L'agent agisce con le azioni di #68: `screenshot()`, `tap(x, y)`, `tapColumn(n)`, `tapSlot(n)`, `openMenu()`, `restart()`. `tapColumn`/`tapSlot` contano la n-esima colonna/slot **visibile**, come la indicherebbe una persona.
4. Il brief all'agent contiene: il profilo (§4), "hai già giocato fino al livello N" e i testi delle schede di suggerimento già viste in quel salvataggio, esattamente come compaiono in gioco (un giocatore vero le ha lette). Niente nomi di meccaniche che il gioco non usa.
5. La scheda la compila l'agent **dopo ogni livello**, non a fine sessione: a fine sessione i ricordi si appiattiscono.
6. Nessun agent rigioca lo stesso pacchetto in un turno successivo: conoscerebbe già le soluzioni.

## 4. Profili
16 profili, uno per agent (`A01` ↔ `P01` …). Ogni profilo ha lingua e viewport fissi (le due misure di #68: 360×640 piccolo, 412×915 alto), un modo di giocare, un **limite di tentativi** per livello e una **soglia di abbandono** della sessione.

| Profilo | Persona e comportamento | Lingua | Viewport | Tentativi/livello | Abbandono della sessione |
|---|---|---|---|---|---|
| P01 | Bambina di 8 anni, distratta: tappa la prima cosa colorata, legge poco | IT | 360×640 | 3 | 3 sconfitte di fila |
| P02 | Pendolare in metro: sessioni di 2 minuti, chiude e riapre dalla mappa ogni 2 livelli | EN | 412×915 | 3 | 3 sconfitte di fila |
| P03 | Puzzle-fan esperto: osserva prima di tappare, pianifica l'ordine | IT | 412×915 | 6 | mai (fine piano) |
| P04 | Impaziente: chiude ogni scheda di suggerimento subito, non apre "Come si gioca" | EN | 360×640 | 4 | 3 sconfitte di fila |
| P05 | Non legge i testi: guarda solo le immagini, ignora sottotitoli e schede | IT | 412×915 | 4 | 4 sconfitte di fila |
| P06 | Perfezionista delle mosse: rigioca un livello vinto se le mosse gli sembrano tante (max 1 volta) | EN | 412×915 | 5 | mai (fine piano) |
| P07 | Over 65 alle prime armi con i giochi: lento, legge tutto, apre "Come si gioca" quando è confuso | IT | 412×915 | 5 | 4 sconfitte di fila |
| P08 | Giocatore di match-3 abituato a titoli commerciali: confronta, si aspetta novità ogni pochi livelli | EN | 360×640 | 5 | 2 livelli di fila "annoiato" |
| P09 | Si scoraggia presto: alla seconda sconfitta pensa di smettere | IT | 360×640 | 2 | 2 sconfitte di fila |
| P10 | Esploratore di menu: apre album, mappa, universi, cambia lingua una volta, poi gioca | IT→EN | 412×915 | 4 | 3 sconfitte di fila |
| P11 | Giocatore della sera, rilassato: tollera sconfitte, cerca il "flusso" | EN | 412×915 | 6 | mai (fine piano) |
| P12 | Adolescente veloce: tappa a raffica (un tap al secondo), provoca nastro pieno | IT | 360×640 | 4 | 3 sconfitte di fila |
| P13 | Genitore interrotto: a metà di un livello su tre esce alla mappa e rientra | IT | 412×915 | 4 | 3 sconfitte di fila |
| P14 | Madrelingua inglese con telefono piccolo: legge tutto, segnala testi tagliati | EN | 360×640 | 5 | 4 sconfitte di fila |
| P15 | Usa sempre "+1 slot e continua" quando compare | EN | 412×915 | 4 | 3 sconfitte di fila |
| P16 | Prudente: non usa mai "+1 slot", preferisce Riprova | IT | 360×640 | 5 | 3 sconfitte di fila |

- **Sconfitta** = tentativo finito con `ingorgo`, `riprova` o `uscita`. Le sconfitte "di fila" si contano attraverso i livelli.
- **Limite di tentativi**: raggiunto il limite, il livello è `saltato`: l'harness carica il salvataggio con quel livello completato e l'agent passa al successivo (il gioco non permette di saltare livelli). Un salto non è un bug: è un dato di difficoltà.
- **Soglia di abbandono**: la sessione finisce (`endReason: soglia-abbandono`) e l'agent spiega perché con le parole del personaggio. È il dato più importante sul coinvolgimento: non va "salvata".
- **Budget di azioni**: al massimo 80 azioni per tentativo e 1.500 per sessione (screenshot esclusi). Oltre, l'harness chiude (`budget`, `budget-azioni`). Serve al limite d'uso, non al personaggio.
- Profilo per profilo, il prompt di persona è la riga della tabella più: "Sei un giocatore, non un tester. Scrivi la scheda con le tue parole, in prima persona. Se non hai capito qualcosa, dillo, anche se poi hai vinto."

## 5. Cosa riporta l'agent, per livello
I campi esatti sono nello schema (`$defs.levelFeedback`); qui il significato.
- **Ho capito cosa fare?** 1–5 · **Difficoltà percepita** 1–5 · **Umore**: divertito / neutro / annoiato / frustrato.
- **Ho capito perché a volte il tocco non lancia?** 1–5, solo se ci sono stati tocchi rifiutati per nastro pieno (#75).
- **Gli ingorghi mi sono sembrati colpa mia o ingiusti?** 1 = ingiusti, 5 = colpa mia, solo se c'è stato un ingorgo.
- **Meccanica** (ai debutti 101, 141, 161, 201, 241, e quando una meccanica è stata la causa della sconfitta): quale, capita 1–5, giusta 1–5.
- **Cosa non ho capito** (testo, vuoto se niente) · **giocherei il prossimo?** sì/no · testo libero.
- **Bug** (vedi §7): passi per riprodurre, atteso, osservato, screenshot.

A fine sessione: divertimento 1–5, "domani lo riaprirei?" 1–5, perché ho smesso, momento migliore e peggiore.

## 6. Telemetria che raccoglie l'harness (#68)
L'agent non scrive questi campi: li scrive l'harness, per **ogni tentativo**, leggendo `window.__mix` (sola lettura, `src/game/debug.ts`) e gli eventi del browser. Schema: `$defs.attempt` e `$defs.sessionTelemetry`.

| Campo | Fonte | Note |
|---|---|---|
| `outcome` | `__mix.status`, `overlay`, scena | vinto / ingorgo / riprova / uscita / budget |
| `durationMs`, `timeToFirstTapMs` | orologio dell'harness | dipende dalla velocità dell'agent: solo confronti tra livelli |
| `ticks` | `__mix.tick` | tempo di gioco, indipendente dall'agent |
| `taps`, `offTargetTaps` | tap dell'harness contro i rect di `columns`, `slots`, `jamButtons`, `tipButton` | tap fuori bersaglio |
| `launches` | `__mix.moves` | |
| `refusals` | `__mix.refusals` | tocchi rifiutati per nastro pieno (#76) |
| `jams` | transizioni di `overlay` a `jam` | |
| `extraSlotUsed` | tap su `jamButtons.continue` | "+1 slot e continua" |
| `maxSlotsUsed`, `slotCount` | **da aggiungere** in `publish()`: un campo in sola lettura con gli slot occupati | oggi `__mix.slots` dà solo i rettangoli |
| `maxBeltUsed`, `beltCapacity` | `__mix.belt` | |
| `painted`, `targets` | `__mix.painted`; `targets` dal livello | `targets − painted` = "mancavano N pixel" (#93) |
| `remaining.{ice,hidden,locked,covered}`, `stoneSplashes`, `reveals` | campi omonimi di `__mix` | effetto delle meccaniche |
| `tipsShown`, `tipDismissMs` | `__mix.tip`, `__mix.guide` | chi salta i testi |
| `consoleErrors`, `uncaughtErrors`, `stuckScreens` | console, `pageerror`, nessun cambio di scena né di `tick` per 10 s dopo un tap | con screenshot |
| `screens`, `languageChanges` | `__mix.scene` | uso di menu, album, "Come si gioca" |
| `build.commit`, `build.version` | commit e `package.json` del build testato | riproducibilità |

Formato: una scheda JSON per sessione (`T01-A03.json`) e una cartella di screenshot accanto. L'harness valida la scheda contro lo schema prima di chiudere la sessione; una scheda non valida non entra nel report. Gli eventi corrispondono a quelli di analytics (#14): ingresso nel livello, esito, uscita dal livello, così il formato si riusa.

## 7. Bug: severità e ticket derivati
| Severità (label) | Quando | Esempi |
|---|---|---|
| `sev: alta` | il giocatore non può andare avanti o perde qualcosa | crash, schermata bloccata, progressi persi, livello non vincibile, bottone che non risponde |
| `sev: media` | si può andare avanti, ma il gioco sbaglia o confonde | regola diversa da quella spiegata, testo tagliato che nasconde un'informazione, lingua sbagliata, tap su un elemento visibile che non fa niente |
| `sev: bassa` | estetica | sovrapposizioni minori, allineamenti, refusi |

- **Bug confermato**: l'agent ha rifatto i passi e si è ripresentato (`reproduced: true`), oppure l'hanno visto 2 agent. Il gioco è deterministico, quindi un bug riprodotto basta.
- **Problema di UX o di difficoltà confermato**: visto da **≥ 3 agent** (1–2 agent = ipotesi, nel report ma senza ticket).
- **Ticket derivato** (stesso schema di #44): uno per problema confermato, figlio dell'epic #66, label `bug` / `ux` / `feature` + `sev:`, con passi per riprodurre, screenshot (link al commit, non al ramo), profili che l'hanno visto. I ritocchi di curva (ordine dei livelli, slot, fasce) sono ticket di implementazione sull'universo.

## 8. Copertura e turni
### Universo 2 (prima esecuzione, #69)
Requisiti: **ogni livello 101–200 visto da ≥ 3 agent**; debutti (101 marrone, 141 pietra, 161 marrone + pietra) e passaggio universo 1 → 2 (**95–110**) visti da ≥ 4; ogni boss (110, 120, …, 200) da ≥ 3.

**Pacchetti**: `U1-FINE` = 95–100 (fine universo 1, sempre insieme a `S11`); `S11` … `S20` = i 10 livelli dello stage. Ogni agent gioca **2 pacchetti**, nell'ordine dei livelli.

**Salvataggio di partenza** (un profilo browser per agent, #68): livelli 1…N−1 completati, livello N aperto, schede di suggerimento già viste = quelle dei debutti prima di N (universo 1: `guide`, `mixing`, `blocked`, `slots`, `belt`, `ice`, `hidden`; poi `brown` se N > 101, `stone` se N > 141). Il secondo pacchetto riparte da un nuovo salvataggio con la stessa regola.

**Turni da 4 agent** (il limite d'uso ne regge 4–5 alla volta). Ogni turno è autosufficiente: dopo ogni turno la copertura cresce in modo uniforme e il report parziale si può già scrivere.

| Turno | Agent: pacchetti |
|---|---|
| T01 | A01: U1-FINE+S11, S12 · A02: U1-FINE+S11, S15 · A03: S13, S17 · A04: S15, S20 |
| T02 | A05: U1-FINE+S11, S14 · A06: S15, S16 · A07: S12, S18 · A08: S17, S19 |
| T03 | A09: U1-FINE+S11, S13 · A10: S14, S20 · A11: S16, S19 · A12: S15, S18 |
| T04 | A13: S12, S17 · A14: S13, S16 · A15: S14, S19 · A16: S18, S20 |

Risultato: `U1-FINE` e S11 da 4 agent (P01, P02, P05, P09: bambina, pendolare, chi non legge, chi si scoraggia: i più sensibili a un muro all'ingresso dell'universo nuovo), S15 da 4, tutti gli altri stage da 3. Un quinto agent per turno, se il limite lo permette, prende il pacchetto con meno sessioni **valide** (vedi sotto).

**Regole dei turni**
1. Prima di ogni turno si ricalcola la copertura dalle schede valide: un livello conta come visto da un agent se ha almeno un tentativo nella sua scheda.
2. Livelli rimasti scoperti per un abbandono o un errore dell'harness tornano in coda e vanno, al turno dopo, a un profilo **diverso** da quello che ha abbandonato (stesso pacchetto, partenza dal primo livello non visto). L'abbandono in sé resta un dato, non si ripete.
3. Tra due turni non si cambia il build. Se un bug `sev: alta` blocca la partita, il turno si ferma, si apre il ticket e i turni ripartono su un build nuovo, che finisce nella scheda (`build.commit`); il report separa i dati per build.
4. Ogni turno chiude con un riassunto breve (livelli coperti, abbandoni, bug nuovi) in un commento su #69, così il turno dopo può partire in un'altra sessione.
5. Opzionale, se resta budget: `U1-ONB` = livelli 1–10 da salvataggio vuoto, con P01 e P04, per ricontrollare l'onboarding con la guida.

### Universo 3 (da preparare per #101)
Stessi profili, pacchetti e regole dei turni, con debutti **201 lucchetto e chiave** e **241 secchiello coperto** e passaggio 195–210.

Il **secchiello coperto** ha difficoltà **solo umana** (#97): il giocatore casuale non guarda i colori, quindi `levelWinRate` non cambia. Il playtest decide se resta:
- **Due build** dello stesso commit: `normale` e `senza-copertura` (stage 25 con `covered` tolto, stessi livelli). Il build B serve solo al playtest e non si rilascia; lo prepara #101 o #68.
- **Gruppi appaiati**: S25 giocato da 8 agent, 4 per build, con gli stessi profili ripetuti nei due gruppi (es. P03, P05, P09, P12 su A e su B). Un agent vede un solo build: chi ha già visto i colori non può "dimenticarli".
- **Misure**: tentativi per livello, vittorie al primo tentativo, ingorghi, `jams` dopo un `reveal`, difficoltà percepita, `jamFairness`, `mechanic.rememberedColors`.
- **Regola di decisione** (come in #97): la meccanica resta se, sui livelli 241–250, il build normale ha in mediana **almeno +0,5 tentativi** o **+1 di difficoltà percepita** rispetto al build B, **e** non più di 1 agent su 4 la giudica ingiusta (`fairness` ≤ 2). Altrimenti si toglie e lo stage 25 usa lucchetto con marrone o pietra.
- Il limite del §1 sulla memoria va scritto accanto al risultato: il verdetto finale resta a #42.

## 9. Come si aggrega (per #69)
- Per livello: vittorie al primo tentativo, tentativi medi, salti, abbandoni, `refusals`, `jams`, uso di "+1 slot", difficoltà percepita, confronto con la curva misurata (`docs/reports/`, vittorie casuali): un livello con difficoltà percepita ≥ 4 e tasso casuale alto, o il contrario, è un'anomalia da guardare.
- Per profilo: dove abbandona, cosa non capisce. Per stage e universo: denti di sega percepiti contro quelli misurati.
- Concordanza: un problema visto da 1 agent è ipotesi, da ≥ 3 è finding (§7).
- Ogni numero del report cita le schede da cui viene (`sessionId`).
