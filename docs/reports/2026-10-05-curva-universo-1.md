# Universo 1: "molto facile" solo dove serve — curva prima/dopo (ticket #89)

Data: 5 ottobre 2026 · Livelli: 100 (universo 1, stage 1–10) · Dati per livello: [`curva-difficolta.json`](curva-difficolta.json) · Grafico: [`curva-difficolta.png`](curva-difficolta.png) · Figure: [`docs/levels/`](../levels/) · Rigenerare: `npx tsx scripts/difficulty-report.ts`

Obiettivo (#89): applicare le regole automatiche della curva (#88, `src/core/curve.ts`) all'universo 1, così che "molto facile" (≥ 95% di vittorie per il giocatore casuale) valga solo per l'introduzione (1–8) e per il primo livello di ogni stage. `scripts/stages/curve-known.ts` passa da **49 errori noti a 0**; le soglie in `CURVE` non sono cambiate.

![Curva di difficoltà](curva-difficolta.png)

## Risultato
- **Livelli molto facili: 55 → 17**: i livelli 1–8 e i primi di stage 11, 21, …, 91. Nessuno dopo l'8 che non sia un primo di stage.
- **Regole di #88**: 0 errori (prima 38 di regola 1 "molto facile fuori posto" e 11 di regola 2 "dente di sega"). Avvisi da 36 a 23, tutti di regola 6 (pochi secondari) o 7 (livello duro lungo); l'unico nuovo è il 78 Scooter (regola 6, vedi Limiti).
- **Regola 5** (fine universo): media dello stage 10 = 65%, obiettivo 69% ± 5%; boss più duro 38% (soglia ≥ 35%).
- **Gruppi di stage** (test esistente): 1–2 → 93%, 3–5 → 84%, 6–8 → 73%, 9–10 → 64%.

## Prima/dopo per stage
"Prima" = livelli spediti dopo #75/#88; "dopo" = questa versione. Vittorie casuali con `levelWinRate` (200 partite, seed = id).

| Stage | Vittorie casuali (media) | Livelli ≥ 95% | Livello più duro | Boss | Nastro | Slot |
|---|---|---|---|---|---|---|
| 1 Atelier | 100% → **97%** | 10 → **8** | 99% → 76% | 99% → 76% | 5 → 5 | 3–4 → 2–4 |
| 2 Frutta | 100% → **89%** | 10 → **1** | 99% → 74% | 99% → 74% | 4 → 3–4 | 3 → 2–3 |
| 3 Animali | 94% → **88%** | 6 → **1** | 78% → 74% | 78% → 74% | 2–3 → 2–3 | 2–3 → 2–3 |
| 4 Giardino | 91% → **85%** | 5 → **1** | 61% → 61% | 61% → 61% | 2–3 → 2–3 | 2–3 → 2–3 |
| 5 Mare | 90% → **79%** | 5 → **1** | 75% → 59% | 91% → 59% | 2–3 → 2–3 | 2–4 → 2–4 |
| 6 Città | 82% → **76%** | 4 → **1** | 60% → 60% | 60% → 60% | 2–3 → 2–3 | 2–3 → 2–3 |
| 7 Cibo | 77% → **74%** | 3 → **1** | 46% → 46% | 46% → 46% | 2–3 → 2–3 | 2–3 → 2–3 |
| 8 Veicoli | 83% → **68%** | 6 → **1** | 43% → 43% | 43% → 43% | 2 → 2 | 2–3 → 2–3 |
| 9 Spazio | 71% → **64%** | 3 → **1** | 42% → 42% | 42% → 42% | 2 → 2 | 2–3 → 2–3 |
| 10 Fantasia | 69% → **65%** | 3 → **1** | 38% → 38% | 38% → 38% | 2 → 2 | 2–3 → 2–3 |

La curva ora scende stage per stage dal 2 al 9 (89 → 64%). Lo stage 10 (65%) resta un punto sopra il 9: la regola 5 lo tiene a 69% ± 5%, quindi non può scendere sotto il 64%; il suo boss (drago, 38%) resta il livello più duro dell'universo.

## Cosa è cambiato nei livelli
45 livelli cambiano (inventario dei secchielli, slot, nastro o figura), 55 sono identici byte per byte (tra cui 1–8 e tutti i primi di stage). Id, nomi e numero dei livelli non cambiano, quindi **i progressi restano validi**.

- **Stage 1**: 9 Pastelli e 10 Tavolozza con 2 slot invece di 3 (91% e 76%): primo ordine da scegliere. Il nastro resta 5.
- **Stage 2**: come proposto nel ticket, dopo il respiro (11) nastro 4 → 3 e slot 3 → 2; da solo non bastava (le figure restavano al 100% anche con nastro 2), quindi 8 frutti sono ridisegnati (sotto). Media 89%.
- **Stage 3–10**: per ogni livello molto facile che non era il primo dello stage, prima le leve (slot 3 → 2, colonne, `ammoChunk`, nastro 3 → 2 dove lo stage lo usa già), poi, se la figura non si induriva, un nuovo disegno. Le fasce `winRate` sono ristrette così che ogni livello stia nel suo posto del dente di sega (base, gradino ≤ base + 3%, duro ≤ base − 5%, boss il più duro).
- **Nessuna fascia oltre l'introduzione arriva al 95%** (nuovo test): rigenerare non può riportare un livello molto facile.
- **Generazione**: tutti i livelli nella fascia della loro spec, nessuno "RELAXED", nessuno regolato automaticamente; `POLICY_VERSION` invariata.

### Figure ridisegnate (29)
Il motivo per cui una figura "non si indurisce" (report di #75, limite 1) è che ogni secchiello trova sempre un pixel da colpire. La correzione è quella indicata nel ticket: **una cornice di un altro colore** (piatto, sfondo, contorno) che blocca i colori della figura finché non è dipinta, oppure **più secondari** (arancione, verde, viola) che accettano un solo primario alla volta. Stessi soggetti e nomi; le anteprime sono in `docs/levels/`.

| Stage | Livelli | Come |
|---|---|---|
| 2 | 12 Arancia, 13 Banana, 14 Mela, 15 Uva, 16 Fragola, 17 Pera, 18 Anguria, 19 Ananas | contorno o piatto blu, banana su sfondo viola, uva su piatto giallo, pera su tovaglia rossa |
| 3 | 23 Ape, 24 Lumaca, 28 Cane | ape arancione a strisce blu, guscio viola, cane fulvo con orecchie rosse |
| 4 | 32 Foglia, 33 Carota | foglia su sfondo rosso (autunno), carota con cornice blu |
| 5 | 42 Granchio, 47 Barca, 50 Faro | granchio in acqua blu, vela arancione e onde blu/verdi, **faro di notte** con cielo viola |
| 6 | 52 Lampione, 56 Ponte, 57 Fontana | lampione nel cielo viola, ponte arancione/viola su acqua blu/verde, acqua della fontana blu/verde |
| 7 | 62 Caramella, 67 Pizza | carta arancione, pizza con più ingredienti |
| 8 | 72 Autobus, 73 Camion, 75 Treno, 77 Elicottero, 78 Scooter, 79 Sottomarino | colori misti e sfondi (cielo, strada, mare) |
| 9 | 82 Luna, 84 Razzo | luna con bordo arancione e stelle viola, razzo arancione nel cielo blu |

### Anomalie note di #75, risolte
- **Boss 50, Faro (91%)**: ridisegnato, ora 59%, il più duro dello stage 5; tolta la nota `easyBoss`.
- **Stage 8 più facile dello stage 7**: 83% → 68%, ora sotto lo stage 7 (74%).
- **12 figure che non si induriscono** (28, 38, 47, 56, 57, 67, 73, 75, 77, 78, 84, 95): 10 ridisegnate; l'annaffiatoio (38) e la casa fungo (95) bastava stringerli (nastro 2, slot 2), senza nuovo disegno.

## Muri di difficoltà nei livelli 9–30
Il criterio del ticket chiede che il playtest agent (#66) non segnali nuovi muri nei livelli 9–30. **Il playtest agent non esiste ancora** (#66 è un epic aperto, sotto-ticket da fare), quindi questo criterio non è verificabile qui e resta da confermare con #66/#42. Come controllo numerico: dal 9 al 30 il salto più grande fra due livelli consecutivi è 15 punti (9 Pastelli 91% → 10 Tavolozza 76%, il primo boss con una scelta vera), poi 10 punti o meno; nessun livello dal 9 al 30 scende sotto il 73%, e il solver dimostra risolvibile ogni livello.

## Limiti
1. **Il giocatore casuale non è una persona**: un 74% casuale per il boss dello stage 2 non dice quanto lo senta duro un bambino. Va provato sul telefono (APK della PR) e poi con #66/#42.
2. **Disegni a cornice**: alcune figure ridisegnate hanno ancora pochi secondari (avvisi di regola 6 su 42, 72, 78, 82, 84; solo il 78 è nuovo) perché la difficoltà viene dalla cornice, come ammesso dal ticket. Restano avvisi, non errori.
3. **Livelli lunghi**: gli avvisi di regola 7 (livelli duri e boss con troppi secchielli) sono un sottoinsieme di quelli di prima (restano 10, 20, 29, 40, 69, 70, 89, 99, 100); il limite è provvisorio fino a #66 e non è in questo ticket.
