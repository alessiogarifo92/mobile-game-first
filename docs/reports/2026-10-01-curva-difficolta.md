# Curva di difficoltà dei 100 livelli (ticket #29)

Data: 1 ottobre 2026 · Livelli: 100 (10 stage) · Dati: [`curva-difficolta.json`](curva-difficolta.json) (una riga per livello, è anche la vista tabellare del grafico) · Rigenerare: `npx tsx scripts/difficulty-report.ts`

![Curva di difficoltà](curva-difficolta.png)

## Come è misurata
- **Vittorie di un giocatore casuale**: percentuale di 400 partite, giocate toccando colonne e slot a caso (un secchiello alla volta), che finiscono con il quadro completo. È una misura di quanto **conta l'ordine** delle mosse: 100% vuol dire che non si può sbagliare.
- **Secchielli per livello**: quante decisioni ci sono in un livello.
- Cosa **non** misura: la difficoltà di lettura (tele 12×12 e 14×14, ghiaccio, pixel nascosti) e la pressione del tempo reale (secchielli che girano insieme). Per questo serve il playtest con persone vere (sotto).

## Per stage

| Stage | Vittorie casuali (media) | Livello più duro | Secchielli (media) | Ghiaccio (media) | Nascosti (media) | Boss |
|---|---|---|---|---|---|---|
| 1 Atelier | 94% | 59% | 7.0 | – | – | 59% |
| 2 Frutta | 98% | 87% | 6.9 | – | – | 87% |
| 3 Animali | 73% | 26% | 9.9 | – | – | 57% |
| 4 Giardino | 80% | 57% | 9.7 | 2.8 | – | 58% |
| 5 Mare | 65% | 29% | 10.6 | 4.2 | – | 70% |
| 6 Città | 77% | 15% | 14.5 | – | 3.2 | 61% |
| 7 Cibo | 76% | 48% | 10.4 | 3.4 | 2.7 | 58% |
| 8 Veicoli | 77% | 35% | 9.0 | 2.7 | 2.0 | 35% |
| 9 Spazio | 75% | 51% | 10.9 | 4.1 | 3.1 | 51% |
| 10 Fantasia | 73% | 49% | 10.6 | 5.1 | 3.8 | 53% |

## Cosa dice
1. **Ogni stage ha la forma voluta**: i primi livelli facili ("di respiro", spesso 100%), poi in salita fino al boss. Si vede come dente di sega nel grafico.
2. **Stage 1–2 sono introduttivi di proposito**: quasi tutti vinti anche a caso. Insegnano le regole senza punire. Lo stage 2 è forse **troppo** facile per 10 livelli: candidato a ritocco se il playtest mostra noia.
3. **Dallo stage 3 l'ordine conta davvero** (media 65–80%, minimi 15–50%). La media non scende ulteriormente negli stage 7–10, ma la difficoltà cresce per altre vie che questa misura non vede: tele più grandi, più ghiaccio (fino a 7) e più pixel nascosti (fino a 5).
4. **Anomalie da guardare nel playtest**:
   - **#59 Grattacielo** (stage 6, penultimo) è il livello più duro di tutti (15%), più del suo boss (61%).
   - **Boss dello stage 5 (#50 Faro, 70%)** è più facile di diversi livelli dello stesso stage (#41 Pesce 42%, #44 Stella marina 29%).
   - **Boss dello stage 8 (#80 Autopompa, 35%)** è un salto netto: va bene se si sente come "finale", altrimenti va ammorbidito.
5. **Generazione**: tutti i 100 livelli rientrano nella loro fascia senza allentamenti. 19 sono stati regolati automaticamente (uno slot in meno o secchielli di altra misura), sempre con almeno 6 secchielli dallo stage 3. Quattro immagini (coccinella, balena, sottomarino, satellite) e cinque della prima stesura (annaffiatoio, stella marina, grattacielo, aereo, cometa) hanno ricevuto uno sfondo colorato: senza "cornici" di un altro colore una forma monocolore si vince comunque.

## Raccomandazioni
1. **Playtest con 10–20 persone** prima di pubblicare (ticket separato): registrare per livello tentativi, uso di "+1 slot", abbandoni. È l'unico modo di misurare la difficoltà percepita, inclusi ghiaccio, nascosti e lettura delle tele grandi.
2. **Riordinare dentro gli stage dopo il playtest**: es. scambiare #59 Grattacielo con il boss #60 se il primo risulta davvero più duro; rendere più duro il boss #50 (meno slot) o spostarlo.
3. **Stage 2**: alzare la difficoltà degli ultimi 3–4 livelli (meno slot) se il playtest conferma che è troppo facile.
4. **Analytics (#14)** in produzione: le stesse metriche per livello, su numeri veri.
5. **Revisione della pixel art** sui fogli `docs/levels/stage-NN.png`: alcune immagini (ape, lumaca, annaffiatoio) sono leggibili ma migliorabili.
