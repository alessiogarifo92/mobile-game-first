# Playtest agent — Universo 5, copertura dei livelli mancanti (turno T26)

Build di main dopo il fix #286 (`a2321a8`), tag `playtest-u5-3`. Moduli in `docs/playtest/sessioni/T26/`. Completa T24 (461–465, 491–500) e T25 (422–427).

## In breve
- **Nessun bug**, nessun blocco, nessun testo tagliato a 360×640. I tre agenti hanno vinto tutti i 30 livelli giocati (401–410, 441–450, 481–490), quasi tutti al primo tentativo; gli ingorghi (402, 408, 409, 442, 450, 488, 490) si risolvono col "+1 slot".
- Divertimento 4/5 per tutti e tre (voglia di riaprire 4/5).
- Con T24 e T25 la copertura dell'universo 5 è completa: 401–410, 421–427, 441–450, 461–465, 481–500. Restano non giocati (e coperti solo dal solver e dai test): 411–420, 428–440, 451–460, 466–480.
- **Due problemi di comprensione ora confermati da ≥ 3 agenti** (regola del protocollo): nessuno blocca il gioco, sono ticket UX.

## 1. Chi ha giocato
| Agente | Profilo | Schermo | Pacchetto | Esito |
|---|---|---|---|---|
| A01 | P01 (bambina 8 anni) | 360×640 it | S41 (401–410) | 10 vinti, 3 ingorghi (402, 408, 409); divertimento 4 |
| A05 | P05 (non legge i testi) | 412×915 it | S45 (441–450) | 10 vinti, 2 ingorghi (442, 450); divertimento 4 |
| A14 | P14 (legge tutto) | 360×640 en | S49 (481–490) | 10 vinti, 2 ingorghi (488, 490); divertimento 4 |

## 2. Problemi confermati (≥ 3 agenti)
1. **Chiavi, lucchetti, tunnel (galleria) e pietre: non si capisce cosa facciano.** Visto da A05, A14 (T26) e da A08, A11, A09 (T24/T25): 5 agenti. Per A05 e A14 il tunnel non mostra mai un effetto visibile e il debutto di ghiaccio+galleria (441) e nascosti+galleria (481) "non insegna" la galleria. → aggiorna #288.
2. **Il simbolo "↩N" (secchiello che torna) è poco chiaro prima della sua scheda**: A01 (402, 408, 409 ingorghi da attesa piena), A05, A14 (la scheda "Perché è tornato" arriva un livello dopo aver visto i badge, 482 vs 481; "Corsia bloccata" a 483). Le righe di suggerimento in cima ai livelli aiutano chi le legge, non chi non legge (P05).

## 3. Ipotesi (1–2 agenti)
- I pallini colorati delle girandole sono minuscoli a 360×640 (A01).
- Il "+N" sotto le colonne non è spiegato (A14).
- Livelli lunghi/stancanti: 444, 449, 450 (A05), 488 (A14, ~70 tocchi).
- Boss 490: l'immagine non si riconosce fino alla fine (A14); la striscia "Livello boss" copre un po' la cornice finché non si chiude (cosmetico).
- Due schede una dopo l'altra a 401 ("Perché è tornato" + "Corsia bloccata") sono molto testo per un'8enne (A01).

## 4. Limiti
Un agente per livello; nessun agente sul 411–420, 428–440, 451–460, 466–480; difficoltà alla soglia di abbandono non testata (A01 ha giocato "bene"). Il divertimento reale lo misura il playtest umano (#42).

## 5. Per la release 0.7.0
Nessun bug aperto dagli agenti; nessun blocco. I punti UX non impediscono di rilasciare.
