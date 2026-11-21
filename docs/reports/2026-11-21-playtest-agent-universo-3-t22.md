# Playtest agent dell'universo 3: turno T22 (mini-turno per misurare #225)

Data: 21 novembre 2026 · Epic #66 e #101 · Seguito dei report di [T20](2026-11-19-playtest-agent-universo-3.md) e [T21](2026-11-20-playtest-agent-universo-3-t21.md) · Schede: [`docs/playtest/sessioni/T22/`](../playtest/sessioni/T22/) · Build: `9ddb9ea` (tag `playtest-u3-3`, con #225, #229 e l'opzione `seenCards` di #230)

## In breve
- **2 agent sonnet, 1 pacchetto ciascuno** (A08 su S29, A09 su S30), con `"seenCards": true`: salvataggio con tutte le card delle meccaniche già viste, tranne "Perché è tornato" e "Corsia bloccata". Stessi profili e viewport di T20 (P08 su S29, P11 su S30, entrambi in inglese), per confrontare lo stesso tipo di giocatore.
- **#225 funziona sul punto che T20 aveva trovato: la card "Perché è tornato" arriva all'inizio del primo livello in cui può servire** (281 per A08, 291 per A09), non dopo il primo ritorno (T20: 246, 287, 298, 3 agent su 3 in ritardo). Tempo di lettura prima di chiuderla: 11,1 s (A08) e 7,4 s (A09).
- **20 livelli, 20 vinti al 1° tentativo, 0 abbandoni, 0 bug.** 10 livelli con un ingorgo (4 + 6), tutti risolti con "+1 slot".
- **Giudizio sulla card: puntuale ma un po' lunga** (A08: "puntuale, pesante di testo"; A09: "un po' presto, ma breve e chiara", perché al 291 nessun secchiello era ancora tornato: è l'anticipo voluto da #225).
- **Nuove ipotesi sui testi (1–2 agent, senza ticket):** §3.

## 1. Chi ha giocato
| Sessione | Profilo | Lingua · viewport | Livelli | Esito | Divertimento · "riaprirei" |
|---|---|---|---|---|---|
| T22-A08 | P08 match-3 abituato | EN 360×640 | 281–290 (10) | piano finito, 10/10 al 1° tentativo | 3 · 3 |
| T22-A09 | P11 giocatore della sera | EN 412×915 | 291–300 (10) | piano finito, 10/10 al 1° tentativo | 4 · 4 |

Screenshot delle sessioni non nel repo.

## 2. Il test di #225 (card nei punti giusti?)
| Card | T20 (3 agent, senza `seenCards`) | T22 (2 agent, con `seenCards`) |
|---|---|---|
| "Perché è tornato" | in ritardo per 3 su 3 (246, 287, 298) | **a inizio del primo livello utile**: 281 (A08), 291 (A09) |
| "Corsia bloccata" | 244 | A08: 281, al primo tocco rifiutato (2 tocchi su una corsia bloccata), **utile**. A09: non compare, **corretto**: in nessun livello di S30 una corsia può bloccarsi (`levelCases` dà `canBeBlocked` falso per 291–300) |

- La card di A09 è "un po' presto" per scelta di #225: al 291 il secchiello non è ancora tornato, ma può farlo. Se dà fastidio, la strada è più testo breve, non più ritardo.
- **Limite del confronto:** 2 agent, tutti e due in inglese; T20 aveva 3 agent di cui uno in italiano. Tutti e due i giudizi sono comunque nella stessa direzione.
- **Effetto collaterale di `seenCards` (non un difetto del gioco):** le card di ghiaccio, nascosti, lucchetti, pietre e coperti sono segnate come viste, ma l'agent non le ha lette davvero. A09 dice quindi di non aver mai capito lucchetti e chiavi: in una partita vera la card dei lucchetti l'avrebbe vista prima. Non va contato come ipotesi sul gioco.

## 3. Ipotesi sui testi e sul gioco (1–2 agent, senza ticket)
- **"Tutti tornerebbero: prova un altro ordine"** (A08 al 283 e 289, A09 lo cita tra i testi in alto): A08 lo giudica senza azione possibile, A09 dice che i due suggerimenti in alto "lo tirano fuori da ogni ingorgo". Parere diviso, confermato da T21: resta ipotesi.
- **I numeri con ↩ cambiano a ogni lancio** (A08, 289: il giallo va 3, 1, 10, 3): difficili da seguire.
- **Ingorghi che sembrano imprevedibili** (A09, `jamFairness` circa 3/5): non si capisce in anticipo quale tocco riempie gli slot; il "!" sulla freccia si nota solo a metà.
- **Mancanza di novità tra 282 e 289** (A08, annoiato in 3 livelli: 285, 286, 287): le etichette "Difficile" da 283 a 289 gli sembrano facili e perdono credibilità; il boss 290 è il momento migliore. Percepita media 2,5 (A08) e 2,7 (A09) su 5, capito 3,6 e 3,9.
- **I pixel chiari non finiti non dicono quale colore vogliono** (A08), e A08 non ha capito a cosa servono i secchielli con "?".
- **Tocchi `c<n>` (harness):** le colonne si spostano quando una si svuota, quindi `column?n=` colpisce un altro secchiello (A08, A09). È un limite dell'API dell'harness, non del gioco: va detto agli agent o aggiunta un'opzione per tappare per colore.
- Nessun testo tagliato in nessuno dei due formati: i fix di #229 reggono (singolare, banner, pannello del 300).

## 4. Difficoltà (solo T22)
| Stage | Sessioni·livello | 1° tentativo | Percepita (1–5) | Capito (1–5) | Ingorghi | "+1 slot" |
|---|---|---|---|---|---|---|
| 29 (281–290) | 10 | 10/10 | 2,5 | 3,6 | 4 | 4 |
| 30 (291–300) | 10 | 10/10 | 2,7 | 3,9 | 6 | 6 |

- Tempo mediano di vittoria: 78 s (A08) e 93 s (A09); livelli più lunghi: i boss, 290 con 141 s e 300 con 142 s. Tetti, non misure: l'agent legge screenshot tra un'azione e l'altra.
- Con T20 e T21, S29 ha ora 4 sessioni e S30 3.

## 5. Limiti
- 2 agent, entrambi in inglese e con profili abituati a giocare: nessun giocatore lento o impaziente (P07, P05) con le card anticipate.
- Un confronto pulito con T20 richiederebbe gli stessi agent e gli stessi livelli; qui sono gli stessi profili, non le stesse sessioni.
- `seenCards` toglie la lettura delle card vecchie (§2): va usato solo per misurare le card nuove.

## 6. Cosa fare
1. **#225 si può considerare verificato** sul punto principale (anticipo della card). Nessun ticket nuovo.
2. Se si vuole agire sui testi: valutare di accorciare "Perché è tornato" e di cambiare "Tutti tornerebbero: prova un altro ordine" in qualcosa su cui il giocatore possa agire. Resta ipotesi con 2–3 agent d'accordo solo a metà: serve un altro turno per un ticket.
3. Il punto 3 di #225 (pietre che bloccano un tiro) resta fuori: serve una decisione di design.
4. Per i prossimi turni: avvisare gli agent che le colonne si spostano, o preferire i tocchi per posizione.
