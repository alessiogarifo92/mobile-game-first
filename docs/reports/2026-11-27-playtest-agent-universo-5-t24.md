# Playtest agent — Universo 5 "Cosmo" (turno T24)

Build `062c4bf` (main dopo lo stage 50), tag `playtest-u5-1`. Moduli in `docs/playtest/sessioni/T24/`.

## In breve
- **Un bug alto confermato**: su schermo piccolo (360×640) la scheda "Perché è tornato" non si chiude con un tocco sul pulsante "Ho capito". L'ha visto A09 (livelli 422–427) e l'ho riprodotto io con un turno di verifica (stesso schermo, livello 422): 4 tocchi sul pulsante disegnato (y≈581) non l'hanno chiusa; si è chiusa solo dopo altri tocchi a y diversi (600/560/520/480/640). Su 412×915 (A11, livello 492) la stessa scheda si chiude in 6 s. Sospetto: zona sensibile del pulsante spostata rispetto al disegno sugli schermi bassi (`placeTipCard` / `tipOkY` in `PlayScene.ts`).
- Il blocco ha impedito di giocare 422–427 a A09: **i livelli 422–427 non hanno dati di gioco veri**.
- A11 (412×915) ha giocato e vinto tutti i livelli 491–500: l'universo si completa, lo schermo finale c'è ("Universo completato").
- A08 (360×640) ha vinto 461–465 al primo colpo e ha mollato per noia (divertimento 2/5).

## 1. Chi ha giocato
| Agente | Profilo | Schermo | Pacchetto | Esito |
|---|---|---|---|---|
| A09 | P09 | 360×640 it | R421–427 | 421 vinto; 422–426 saltati; 427 abbandonato (bloccato dalla scheda) |
| A08 | P08 | 360×640 en | S47 (461–470) | 461–465 vinti al primo colpo; abbandono dopo 465 (soglia noia) |
| A11 | P11 | 412×915 en | S50 (491–500) | tutti vinti, piano finito; divertimento 4/5 |

## 2. Novità (schede di debutto)
- `iceFilm` (421), `hiddenFilm` (461), `allPairs` (491): lette e chiuse in ~6 s dai tre agenti. A08: 461 il momento migliore ("strappare la pellicola blu"). A11: la scheda "Tutti insieme" è simpatica ma troppo corta per insegnare.

## 3. Curva
- 461–465: tutti vinti al primo colpo, 0 decisioni difficili, il badge "Difficile" non corrisponde alla sensazione (A08). Un incastro (463) risolto con lo slot extra senza costo.
- 491–500: 5 incastri (492, 497, 498, 500 con slot extra), vinti tutti; 497 e 498 a 6 pixel dalla fine frustrano (A11). Boss 500 percepito come "versione più grande di 497–499", non un vero finale; schermo finale bello ma "silenzioso".

## 4. Problemi
**Confermato (bug):** scheda "Perché è tornato" su 360×640 non si chiude (sev: alta) — A09 + riproduzione mia.

**Ipotesi (1–2 agenti, nessun ticket per la regola dei ≥3 agenti):**
- Chiavi, lucchetti, girandole e "?" non spiegati (A08 e A11, 2 agenti).
- Ripetitività / noia nelle fasce 461–465 (A08) e difficoltà percepita bassa.
- Boss 500 poco "finale"; schermo di fine universo poco celebrativo (A11).
- Densità della scheda "Perché è tornato" (A09, ma il suo giudizio è inquinato dal blocco).

## 5. Problemi dello strumento
- I moduli A09 dei livelli 422–426 hanno `offTargetTaps` alti: sono i tocchi non andati a segno sul pulsante (conferma il bug), non errore di mira dell'agente.
- Le bozze `.draft.json` restano con `errore-harness` finché non si chiude la sessione: normale.

## 6. Limiti
Un solo agente per livello; nessun profilo P01/P05; coppie ice+tunnel (441) e hidden+tunnel (481) non giocate; livelli 401–420 non coperti; A08 non è arrivato al boss 470.

## 7. Da fare
1. Ticket bug (figlio di #66, `bug`, `sev: alta`): scheda "Perché è tornato" (e probabilmente ogni scheda con `placeTipCard`) non chiudibile su 360×640; poi rigiocare 422–427 con A09.
2. Proporre all'utente: ticket UX su chiavi/lucchetti/"?" (2 agenti → da confermare con più agenti), curva 461–465, finale del boss 500.
3. Il playtest umano (#42) resta quello che misura il divertimento vero.

## 8. Verifica dopo la correzione (turno T25, #286 → PR #290)
A09 (P09, 360×640, it) ha rigiocato 422–427 su build con la correzione. Scheda in `docs/playtest/sessioni/T25/`.
- La scheda "Perché è tornato" (422) e "Corsia bloccata" (423) si chiudono al primo tocco sul pulsante disegnato (`tipDismissMs` ≈ 4 s, era 54 s). Nessun bug aperto: **#286 verificato**.
- 422, 424, 425, 426, 427 vinti al primo tentativo; 423 vinto al secondo (un ingorgo: l'attesa si riempie di rossi con "↩"; difficoltà 4/5, il più duro). Divertimento 4/5.
- Dubbi di comprensione (1 agente, ipotesi, coerenti con #288): lucchetto e chiave a 424 e 427 si sbloccano da soli senza che si capisca come.
- Limite: un solo agente, un solo schermo.
