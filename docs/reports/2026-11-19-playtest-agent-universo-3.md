# Playtest agent dell'universo 3: report del turno T20 (livelli 241–300)

Data: 19 novembre 2026 · Epic #66 (playtest) e #101 (universo 3) · Protocollo: [`docs/playtest/protocollo-agent.md`](../playtest/protocollo-agent.md) · Harness: `npm run playtest` (#68) · Schede: [`docs/playtest/sessioni/T20/`](../playtest/sessioni/T20/) · Build: `644b268` (v0.5.0, tag `playtest-u3-1`, variante normale)

## In breve
- **Versione economica: 3 agent in 1 turno** (modello sonnet), uno per stage: 25 (241–250), 29 (281–289) e 30 (291–300). Per il protocollo (≥ 3 agent per finding, 1–2 = ipotesi) **quasi tutto qui è ipotesi**.
- **29 livelli giocati, 29 vinti, 28 al 1° tentativo.** Unica sconfitta: 286 (vinto al 2° tentativo). **Bug: 0**, errori JS non gestiti: 0, schermate bloccate: 0.
- **Nessun muro** negli stage visti. Difficoltà percepita 2–5 (media 3,0), non sale con lo stage: 3,0 (S25), 2,9 (S29), 3,1 (S30). Il tasso casuale scende da 65% a 56% e questo non si sente.
- **Un solo risultato confermato (3 agent su 3): la card "Perché è tornato" arriva tardi** (246, 287, 298). Aperto il ticket #225.
- **Un abbandono anticipato:** A02 (P08, giocatore di match-3) si ferma dopo 288 e 289 "annoiato"; il boss 290 non è stato giocato (ipotesi, 1 agent).
- **Divertimento 4 · 3 · 4, "domani lo riaprirei" 4 · 2 · 4.**

## 1. Chi ha giocato
| Sessione | Profilo | Lingua · viewport | Livelli | Esito | Divertimento · "riaprirei" |
|---|---|---|---|---|---|
| T20-A01 | P03 esperto | IT 412×915 | 241–250 (10) | piano finito, 10/10 al 1° tentativo | 4 · 4 |
| T20-A02 | P08 giocatore di match-3 | EN 360×640 | 281–289 (9) | 9/9 (286 al 2° tentativo), stop dopo il 289: noia | 3 · 2 |
| T20-A03 | P11 giocatore della sera | EN 412×915 | 291–300 (10) | piano finito, 10/10 al 1° tentativo, schermata di fine universo vista | 4 · 4 |

Gli screenshot delle sessioni (14–18 MB per agent) non sono nel repo, solo le schede JSON.

## 2. Difficoltà
"Casuale" è `levelWinRate` ([curva](2026-11-19-curva-universo-3.md)). Un solo agent per stage: i valori sono indicativi.

| Stage | Livelli | 1° tentativo | Percepita (1–5) | Capito (1–5) | Casuale | Ingorghi | "+1 slot" | Mediana vittoria |
|---|---|---|---|---|---|---|---|---|
| 25 (241–250) | 10 | 10/10 | 3,0 | 3,7 | 65% | 3 | 3 | 118 s |
| 29 (281–289) | 9 | 8/9 | 2,9 | 3,3 | 62% | 6 | 5 | 191 s |
| 30 (291–300) | 10 | 10/10 | 3,1 | 3,5 | 56% | 6 | 6 | 94 s |

- **Boss 250 (27% casuale):** vinto al 1° tentativo con un ingorgo risolto con "+1 slot", difficoltà percepita 5, il valore più alto del turno. **Boss 300 (26%):** 1° tentativo, difficoltà 3. Boss 290: non giocato. I boss sono ancora vinti, ma passano da "+1 slot".
- **Ingorghi:** 15 su 29 livelli, quasi tutti risolti con "+1 slot" (14 usi): lo strumento regge la curva ma non insegna a evitare l'ingorgo. I livelli con difficoltà percepita ≥ 4 (245, 248, 250, 283, 285, 286, 294, 299) hanno tutti un ingorgo.
- **Livello più lungo: 285** (374 s, pietre che bloccano i tiri), contro una mediana dello stage di 191 s. Gli altri restano sotto i 4 minuti.
- **Anomalie (percepito ≥ 4 con casuale ≥ 70%):** nessuna. Nell'altro verso (percepito ≤ 2 con casuale ≤ 35%): nessuna.

## 3. Giocabilità e chiarezza
**Confermato (3 agent su 3):**
- **C1. "Perché è tornato" arriva tardi.** La card compare solo dopo che il problema è già successo: A01 al 246, A02 al 287, A03 al 298. Il giocatore subisce il primo ritorno di vernice avanzata senza la spiegazione. Collegato a F1 del [report dell'universo 2](2026-10-31-playtest-agent.md). → ticket **#225**.

**Ipotesi (1 agent, senza ticket di loro):**
- I suggerimenti in alto ("Rilancia per primo quello senza freccia", "Nessun lancio sicuro") e i numeri della freccia ↩ non sono chiari (A01 241 e altri). Incluso nel #225.
- "Corsia bloccata" compare al 244 e la card dei secchielli coperti dopo il primo tentativo al 286 (A02). Incluso nel #225.
- Pietre che bloccano i tiri al 285 segnalate solo da piccoli triangoli di avviso (A02).
- Lucchetti, ghiaccio e le stelline grigie si notano solo vedendoli aprirsi da soli (A01 242).
- Ingorghi forzati nei livelli grandi (245, boss 250): equità 2 (A01).
- Noia dopo la routine "tocca, aspetta, rilancia, +1 slot" senza una nuova idea dopo le card meccaniche di 281–287 (A02, 288–289).

**Bug:** nessuno (`bugs[]` vuoto nelle tre schede).

## 4. Limiti
- **1 agent per stage, 0 agent su 290 e su 251–280.** Nessun A/B sui secchielli coperti. Copertura U3: 29 livelli su 100, minimo previsto dal protocollo (≥ 3 agent per livello) non raggiunto, perché il turno è la versione economica.
- Il tempo di vittoria è un tetto (tick × 85 ms, un agent è più lento di un dito).
- Gli agent giocano in modo coerente con il profilo: un profilo da match-3 che si annoia è un segnale, non una misura.

## 5. Costo e prossimi passi
- Versione economica scelta dall'utente: 3 agent sonnet in 1 turno invece del turno completo del protocollo (16 agent in 4 turni). Il consumo effettivo non è misurato in questo report.
- **Opzionale (C):** un secondo turno con 3–6 agent sugli stessi stage (boss 290, secchielli coperti in A/B) per portare le ipotesi sopra a 3 agent. Non richiesto per ora.
- **#225** (card anticipate e suggerimenti più chiari) è il solo intervento che questo turno giustifica con certezza.
