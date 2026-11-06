# Playtest agent di conferma per #176: report (Refs #176 #174)

Data: 5 novembre 2026 · Epic #66 · Protocollo: [`docs/playtest/protocollo-agent.md`](../playtest/protocollo-agent.md) · Harness: [`scripts/playtest/`](../../scripts/playtest/README.md) · Build: ramo `worktree-176-feedback-chiarezza` a `c672f20` per T16 e T17 · Schede: [`docs/playtest/sessioni/T16`](../playtest/sessioni/T16), [`T17`](../playtest/sessioni/T17) · Variante `normale` · Turno precedente: [`2026-11-05-playtest-ux-174.md`](2026-11-05-playtest-ux-174.md) (T13–T15).

## In breve
- **Stessi profili e stessi pacchetti di T13–T15**: P09 e P16, `U1-ONB` + `S09` (T16, un subagent sonnet nuovo per ogni pacchetto) e `S10` (T17). 6 pacchetti, 4 schede, tutte valide contro lo schema. Gli agent sono nuovi: non ricordano T13–T15.
- **53 livelli giocati su 60.** P16 ha chiuso S09 al livello 83 per soglia di abbandono (3 ingorghi di fila, mai "+1 slot"). È un dato e non è stato "salvato": in T14 lo stesso profilo aveva perso 82 e 83 una volta ciascuno. Le regole e i livelli non cambiano in #176.
- **P1 (rifiuto del tap): migliorato, 4 rifiuti su 4 notati.** Nessuno parla di "tap rotto". Al livello 82 P09 vede i cerchi col pallino rosso e lancia proprio il rosso. Dopo i cerchi a 97 scrive "lì ho capito".
- **P4 ("↩N" e "!"): risolto nella lettura.** Tutte e 4 le sessioni a fine gioco spiegano giusto sia "↩N = quanta vernice torna se lo lanci adesso" sia "! = prende l'ultimo slot". Resta un bisogno nuovo: il "!" avvisa ma non dice come uscirne (§3).
- **P5 (le "girandole"): contrasto risolto, riconoscimento no.** Il ghiaccio ora si vede e viene nominato da tutti ("girandola azzurra"), ma solo 1 sessione su 4 lo riconosce come ghiaccio, e con un "credo". Pesa un limite dell'harness: chi parte da 81 non ha mai visto la scheda "Pixel ghiacciati" disegnata, solo il suo testo nel brief (§4).
- **P8 (disegno della scheda "Corsia bloccata"): 2 su 3 lo trovano corrispondente** (P16 a 83 e a 94). P09 a 97 lo trova "scollegato": il caso disegnato era giusto, ma il colpo blu ("■→") era troppo piccolo a 360×640. **Corretto dopo il turno** in `df1f0ea`: il secchiello toccato ora è disegnato pieno. Questa correzione non è passata da un nuovo playtest.
- **Nessun bug segnalato, nessun errore di console.**

## 1. Chi ha giocato
| Sessione | Profilo | Pacchetti | Livelli | Esito | Ingorghi · "+1 slot" | Divertimento · "domani lo riaprirei" |
|---|---|---|---|---|---|---|
| T16-A09 | P09 si scoraggia presto (IT 360×640, max 2) | U1-ONB + S09 | 1–10, 81–90 | piano finito, 20/20 (19 al 1° tentativo) | 4 · 83, 85, 88 | 3 · 3 |
| T16-A16 | P16 prudente, mai "+1 slot" (IT 360×640, max 5) | U1-ONB + S09 | 1–10, 81–83 | **soglia di abbandono a 83** (3 ingorghi di fila) | 4 · mai | 2 · 2 |
| T17-A09 | P09 | S10 | 91–100 | piano finito, 10/10 al 1° tentativo | 3 · 92, 97, 98 | 3 · 3 |
| T17-A16 | P16 | S10 | 91–100 | piano finito, 10/10; 94 al 3° e 97 al 2° | 3 · mai | 4 · 4 |

## 2. I quattro problemi di #176, prima e dopo
| # | T13–T15 (prima) | T16–T17 (dopo) | Esito |
|---|---|---|---|
| **P1** cerchi del rifiuto | "spariti in meno di 1 s", "quasi un tap rotto" la 2ª volta (P09); 2 rifiuti non notati (P16, 98–99) | 4 rifiuti su 4 raccontati nelle schede (T16-A09 82, T16-A16 83, T17-A09 97, T17-A16 94). P09 a 82: "il pallino rosso sul cerchio è il colore che apre il pixel; ho lanciato il rosso". P09 a 97: "dopo ho visto cerchi con il colore che serve sulle caselle: lì ho capito". P16 a 94: il pallino "l'ho notato solo dopo" la scheda | **migliorato** |
| **P4** "↩N" e "!" | "!" non spiegato; "↩10" su un secchiello mai lanciato preso per un errore (P16, 83) | 4 sessioni su 4 spiegano entrambi giusto a fine sessione. "↩" su un secchiello non lanciato sorprende ancora la prima volta (T16-A09 a 7, T17-A16 a 96: "mi sembrava un errore"), poi è capito | **risolto nella lettura** |
| **P5** icone chiare sulla tela | "girandole chiare… mai capite" (P16, 20 livelli) | Le vedono tutti e le chiamano "girandola azzurra". Non le riconoscono in 3 sessioni su 4; T17-A16: "ghiacciato (credo)". Le pietre invece sono riconosciute ("pietre grigie: ostacoli") | **contrasto risolto, riconoscimento aperto** |
| **P8** disegno della scheda | secchiello blu disegnato, rosso/giallo toccato: "mi ha confuso" (2/2) | T16-A16 83: chiaro; T17-A16 94: "il disegno corrispondeva a quello che avevo davanti"; T17-A09 97: "arancione/pallino rosso mentre io avevo un blu" | **2/3, corretto dopo il turno** (`df1f0ea`) |

## 3. Cosa resta e cosa è nuovo
Un problema visto da 1–2 agent è un'ipotesi (§7 del protocollo). Le proposte servono a decidere se aprire un ticket.

| # | Problema | Sev. | Visto da | Proposta |
|---|---|---|---|---|
| N1 | **Il ghiaccio non viene riconosciuto** anche se ora si vede (P5). In parte è un limite dell'harness: il salvataggio di 81 e 91 segna "Pixel ghiacciati" come già vista (il ghiaccio debutta al 66), quindi l'agent ne ha letto solo il testo, non il disegno. Un giocatore vero l'ha vista 15–25 livelli prima | media | 3/4 sessioni | Un richiamo: la scheda "Pixel ghiacciati" di nuovo al primo livello con ghiaccio dopo una lunga pausa, oppure una legenda delle caselle in "Come si gioca" |
| N2 | **Il "!" avvisa ma non dice come evitare l'ingorgo**: "l'avviso '!' non mi dava una via d'uscita" (T16-A16 83), "il '!' non mi dice se andrò in ingorgo" (T17-A09 98). È la causa dell'abbandono di P16 a 83 | media | 2/4 | Nella scheda "Perché è tornato", una frase sul rimedio: prima rilancia un secchiello in attesa per liberare uno slot |
| N3 | **"Ingorgo!" non dice quale secchiello lo ha causato** (T16-A09) | bassa | 1/4 | Evidenziare sul pannello il secchiello che non ha trovato posto |
| N4 | **Scheda "Slot d'attesa" con lo spazio del disegno vuoto** (T16-A09 0027, T16-A16 0024): è P3 di #174, ancora aperto | bassa | 2/2 | Come P3 |
| N5 | **"Nuovo stile dei secchielli" non spiegato** (a 10, 90 e 100): è P7 di #174, ancora aperto | bassa | 4/4 | Come P7 |

## 4. Limiti
- 2 profili, 4 schede: ipotesi, non finding (§7). Gli stessi profili rigiocano pacchetti già visti in T13–T15 (deroga voluta al §3.6, chiesta da #176): gli agent sono nuovi e non hanno memoria dei turni precedenti.
- **Il brief chiedeva di guardare subito lo schermo dopo un tocco che non lancia nulla**, per compensare il fatto che un agent vede istantanee e non il flusso continuo. Questo favorisce P1 rispetto a T15, dove il brief non lo chiedeva.
- Domande di fine sessione nuove e neutre (cosa vuol dire "↩" e "!", cosa sono le caselle, cosa ha detto il gioco a un tocco rifiutato). In T13–T15 non c'erano: il confronto per P4 e P5 usa quindi il testo libero di quei turni.
- **La correzione di P8 (`df1f0ea`) è successiva ai turni** e non è passata da un nuovo playtest: è verificata dall'e2e `e2e/feedback-176.spec.ts` e dagli screenshot in `docs/test-evidence/176-feedback-chiarezza/`.
- Harness: nel tentativo chiuso con `uscita` (T16-A16, 83, 3° tentativo) `blockedTaps` vale 0 anche se la scheda "Corsia bloccata" compare. Probabilmente il valore viene letto dopo l'uscita dalla scena; da verificare con #179, che azzera `blockedTaps` in `PlayScene.init`. All'avvio di un pacchetto il gioco mostra la mappa e non il livello (gli agent lo segnalano): è il salvataggio dell'harness, non il gioco.
- Il tatto, il ritmo e la memoria a breve termine di un dito vero non si misurano (§1). Resta da confermare sul telefono.
