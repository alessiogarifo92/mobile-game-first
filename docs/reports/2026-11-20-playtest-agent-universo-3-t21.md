# Playtest agent dell'universo 3: turno T21 (build con le card anticipate di #225)

Data: 20 novembre 2026 · Epic #66 e #101 · Seguito del [report di T20](2026-11-19-playtest-agent-universo-3.md) · Schede: [`docs/playtest/sessioni/T21/`](../playtest/sessioni/T21/) · Build: `077a21a` (v0.5.0, tag `playtest-u3-2`, variante normale, con #225)

## In breve
- **4 agent sonnet in 1 turno** (A04, A05, A06, A07). Con T20 gli stage hanno ora: S25 **2 agent** (A06 solo 241–245), S29 **3** (T20-A02, A04, A05; il boss 290 da A04 e A05), S30 **2**.
- **26 livelli distinti (36 sessioni·livello): 34 vinti, tutti al 1° tentativo, 0 abbandoni per sconfitte.** Due livelli non finiti, **entrambi per un errore di tocco dell'agent, non per il gioco** (vedi sotto): 246 (A06, sessione chiusa lì) e 298 (A07, saltato).
- **Boss 290: nessun muro.** 2 agent su 2 lo vincono al 1° tentativo, senza ingorghi, difficoltà percepita 3 e 3. **Boss 300 (2 agent con T20):** vinto da entrambi al 1° tentativo, difficoltà 3 e 5; A07 con nastro da 1 e tocchi a raffica va subito in ingorgo e lo vince andando piano.
- **Bug del gioco: 0.** I 2 bug "alta" delle schede (A06-B01 al 246, A07-B01 al 298) sono **non confermati**: riprodotti con uno script, la scheda "Perché è tornato" si chiude. L'agent toccava circa 25–30 px sopra il pulsante.
- **#225 non è ancora verificato da questo turno** (limite del setup, §3). Le ipotesi sui testi si rafforzano.

## 1. Chi ha giocato
| Sessione | Profilo | Lingua · viewport | Livelli | Esito | Divertimento · "riaprirei" |
|---|---|---|---|---|---|
| T21-A04 | P07 over 65 | IT 412×915 | 281–290 (10) | piano finito, 10/10 al 1° tentativo | 3 · 3 |
| T21-A05 | P14 telefono piccolo | EN 360×640 | 281–290 (10) | piano finito, 10/10 al 1° tentativo | 4 · 4 |
| T21-A06 | P01 bambina distratta | IT 360×640 | 241–246 (6) | 5 vinti; chiusa al 246 per la scheda "non chiudibile" | 3 · 2 |
| T21-A07 | P12 adolescente veloce | IT 360×640 | 291–300 (10) | 9 vinti, 298 saltato (stesso errore di tocco) | 4 · 4 |

Screenshot delle sessioni non nel repo.

## 2. Difficoltà (solo T21)
| Stage | Sessioni·livello | 1° tentativo | Percepita (1–5) | Capito (1–5) | Ingorghi | "+1 slot" |
|---|---|---|---|---|---|---|
| 25 (241–246) | 6 | 5/6 | 2,3 | 3,5 | 1 | 1 |
| 29 (281–290) | 20 | 20/20 | 3,1 | 3,7 | 10 | 10 |
| 30 (291–300) | 10 | 9/10 | 3,4 | 3,4 | 7 | 7 |

- Ogni ingorgo (18 su 36 sessioni·livello) è risolto con "+1 slot": lo strumento regge la curva. A04 li giudica in parte ingiusti (`jamFairness` 3) perché arrivano a 6–13 pixel dalla fine. A05 li causa lanciando con gli slot pieni, e il gioco lo permette.
- **Livello più lungo: 285** (254 s mediana tra A04 e A05, pietre), come in T20 (374 s). Boss 290: 218 s, boss 300: 211 s.

## 3. Il test di #225: perché questo turno non basta
Gli agent partono da un salvataggio dove **le card delle meccaniche dei livelli pianificati sono ancora da vedere** (saves.ts). Il gioco ne mostra **una per livello**, quindi la coda ritarda ogni card: A05 vede pietre, lucchetti, coperti e "Perché è tornato" a 285, 286, 287 e 288, tre-otto livelli dopo il primo incontro con la meccanica. Un giocatore vero le avrebbe viste molti stage prima. Per questo:
- **le card delle meccaniche vecchie in ritardo sono un limite del setup, non un difetto**;
- **"Perché è tornato" resta in fondo alla coda** (A04 288, A05 288, A07 298, A06 246) e **non si può dire** se #225 la anticipi bene in una partita reale;
- "Corsia bloccata" è arrivata al momento giusto (A05, 283).
- **Cosa serve:** un'opzione del harness che parta con **tutte le card delle meccaniche già viste tranne "Perché è tornato" e "Corsia bloccata"**, e due o tre agent su livelli con ↩. Fatto quello, il confronto con T20 è pulito.

## 4. Ipotesi sui testi (1–2 agent, senza ticket)
- **Suggerimenti in alto:** "Lancia prima uno senza ↩" e "Rilancia prima quello in attesa" aiutano (A04, A06, A07). "Tutti tornerebbero: se si blocca +1 slot" e "cambia l'ordine" restano oscuri (A04, A06, A07); A05 nota che mostra un pulsante che non c'è finché non compare il pannello d'ingorgo.
- **Il simbolo ↩ tra virgolette è minuscolo a 360 px** (A05).
- **I pallini sulle corsie bloccate sono difficili da leggere** (A05, 286 e 290).
- **Il banner "Quadro più grande" copre il titolo del livello** (A06, A07: 296 e 299).
- **Nel pannello finale del 300 "completato in 21 mosse" si sovrappone a "Stage completato! Nuovo stile dei secchielli"** (A07).
- **Testo errato: "Nastro: max 1 secchielli"** (A05, A07). Da correggere con il plurale/singolare giusto.
- Le schede lunghe (lucchetti e chiavi) vengono ignorate (A06); il lancio con gli slot pieni è permesso e dà l'ingorgo solo dopo (A05).

## 5. I due "bug" non confermati
A06 al 246 e A07 al 298 hanno segnalato che la scheda "Perché è tornato" non si chiude e che ◀ e ⟲ non rispondono. **Riprodotto il 20 novembre a 360×640:** su una partita al 246 la scheda compare a metà livello, un tocco a y=575 non la chiude, un tocco a y≥585 sì. Il pulsante è a y≈603; le schede sono modali e coprono tutto lo schermo, per questo ◀ e ⟲ non rispondono. A07 ammette l'errore nella sua scheda. Le schede JSON restano come scritte dagli agent: per l'aggregato questi due bug vanno scartati (`reproduced` falso).

## 6. Limiti
- 1–2 agent per stage; S25 solo 241–246; il 298 è mancante.
- Il test su #225 non è pulito (§3). I tempi di vittoria sono un tetto.
- Gli screenshot dell'agent restano indietro di un'azione dopo i lanci (A04), e l'agent stima le coordinate a occhio: due livelli persi per questo.

## 7. Cosa fare
1. **Correggere "Nastro: max 1 secchielli"** e il banner "Quadro più grande" che copre il titolo, il testo del pannello del 300 (ticket piccolo, riproducibile a mano).
2. **Opzione del harness** per un salvataggio con solo le due card nuove da vedere, poi un mini-turno (2–3 agent) per misurare #225 pulito.
3. Il resto (suggerimenti in alto, ↩ minuscolo, pallini) resta ipotesi finché non c'è un terzo agent.
