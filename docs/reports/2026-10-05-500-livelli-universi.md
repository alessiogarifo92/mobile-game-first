# 500 livelli in 5 universi — ricerca per i ticket

Data: 5 ottobre 2026 · Stato: **bozza da confermare**, nessun ticket ancora creato.
Richiesta: arrivare ad almeno 500 livelli, in universi da 100; difficoltà molto bassa solo nei primi livelli, poi in salita; nuovi modi per aumentare la difficoltà e tenere alta l'attenzione (anche con spunti di psicologia); un universo si sblocca e si può scegliere solo dopo l'ultimo livello del precedente.

## 1. Da dove partiamo (codice e ticket aperti)

| Cosa | Stato oggi | Impatto sui 500 livelli |
|---|---|---|
| Struttura | 100 livelli = 10 stage × 10 (`scripts/stages/stage-NN.ts`), boss = 10° di ogni stage | Va aggiunto un livello sopra lo stage: **universo = 10 stage = 100 livelli** |
| Costanti fisse | `LEVELS_PER_STAGE = 10`, `STAGES` con 10 voci (`src/core/stages.ts`); "in arrivo" se `LEVELS.length % 10 !== 0 \|\| < 100` (`MenuScene.ts:65`); `AlbumScene` pagina su `STAGES.length`; skin = una per stage (`album.ts`, 10 + classic) | Tutto già in **#74** (contenuti scalabili): è il prerequisito tecnico |
| Salvataggi | `unlocked` + `completed[]` con id globali, `sanitize` taglia a `levels.length` | Gli id globali 1–500 funzionano già; lo sblocco è lineare, quindi finire il 100 sblocca il 101. Serve solo derivare "universo sbloccato" |
| Difficoltà misurata | `winRate` di un giocatore casuale per fascia di spec; report #29 | **#75** (PR #86 aperta): con le regole vere del nastro 50 livelli su 100 sono troppo facili, curva stage 3–10 piatta (87–97%). **#71** deve fissare le fasce assolute. Le fasce dei 500 livelli dipendono da questi due |
| Prime fasi | Stage 1–2 (20 livelli) quasi sempre vinti anche a caso (94–100%) | Contro la richiesta: "molto facile" deve durare **pochi** livelli |
| Meccaniche | primari, secondari, ghiaccio (stage 4), nascosti (stage 6), colonne 2–4, slot 2–4, nastro 2–5, tele fino a 14×14 | Per 400 livelli in più servono **meccaniche nuove**, non solo numeri più stretti |
| Contenuto | 100 immagini pixel art scritte a mano + nome i18n IT/EN per livello e stage; `levels.json` 95 KB | 400 immagini, 400 nomi × 2 lingue, 40 nomi di stage, 5 di universo; `levels.json` ~475 KB |
| Ticket collegati | #70 epic difficoltà, #71, #72, #73 (UI difficoltà), #74, #75, #77 (spiegare ogni novità), #17 (livello del giorno), #15 (galleria), #42/#66 playtest | Riusati, non duplicati (sezione 6) |

## 2. Cosa dice la ricerca (sintesi utile al design)

1. **Flow** (Csikszentmihalyi; tesi di Jenova Chen): sfida e abilità devono crescere insieme. Troppo facile → noia, troppo difficile → ansia. Un tutorial lungo e banale è la prima causa di noia.
2. **Curva a dente di sega**, non rampa: la difficoltà sale, poi cala un po' quando arriva una novità (per impararla), poi risale più in alto di prima. Il primo livello con un ostacolo nuovo lo **insegna**, non punisce.
3. **Cadenza delle novità**: nei match-3 di produzione si introduce un ostacolo nuovo ogni **10–20 livelli** (15–25 tipi di ostacolo nel tempo). Per noi: una meccanica nuova ogni ~20 livelli (2 stage) è coerente.
4. **Distribuzione dei livelli duri**: Candy Crush mette più "super hard" di fila; Royal Match mette un livello duro "travestito da normale" **subito prima** del super hard. Il livello difficile va **segnalato** (etichetta "Difficile") così la sconfitta è attesa e non frustra.
5. **Livelli duri = corti** (King): se un livello è molto difficile deve essere breve, per non far perdere minuti di lavoro.
6. **Near-miss**: chi perde "per un pelo" riprova molto più spesso. Royal Match ha ~2× i momenti "quasi persa" di Candy Crush. Per noi va ottenuto con il design (livelli che si giocano fino in fondo), **mai** truccando il risultato.
7. **Goal gradient**: lo sforzo cresce vicino al traguardo → barre "37/100" per universo e "7/10" per stage.
8. **Zeigarnik**: le cose incomplete restano in mente → album/murale con caselle vuote, universo successivo visibile ma chiuso.
9. **Endowed progress**: partire con un po' di progresso già fatto motiva di più (es. il primo quadro del murale già disegnato).
10. **Loss aversion**: "stai per perdere la serie" funziona, ma va usato con misura.
11. **Difficoltà dinamica (DDA)**: aiutare dopo una serie di sconfitte aumenta l'engagement (studi fino a +9%). Da noi solo in forma **trasparente** (aiuto offerto, livello invariato).
12. **Dark pattern**: UE e UK stanno guardando near-miss artificiali, timer che spingono a pagare, loot box. Regola di progetto già scritta: "niente livelli truccati". Teniamo ricompense cosmetiche e gratuite, nessuna sconfitta truccata, nessun timer a pagamento.

Riferimenti dei concorrenti (stesso sottogenere): **Pixel Flow** ha 559+ livelli, livelli marcati "Hard", ostacoli che arrivano nel tempo (muri, cancelli, lucchetti e chiavi, scatole concentriche, secchielli "sorpresa" e "collegati") e un evento a tempo dal livello 30.

## 3. Struttura proposta: 5 universi × 100 livelli

- **Universo = 10 stage × 10 livelli**, id globali 1–500; il boss resta il 10° di ogni stage, il livello 100 di ogni universo è il **boss finale** dell'universo.
- **Sblocco**: l'universo N+1 è selezionabile solo dopo aver **completato l'ultimo livello** (boss) dell'universo N. Prima è visibile ma chiuso, con anteprima e "Completa il livello 100 per aprire" (curiosità + Zeigarnik).
- **Selettore universi**: schermata (o barra in cima alla mappa) con le 5 card; ogni universo ha la sua mappa, il suo colore di fondo e la sua barra 0/100. Gli universi già finiti restano rigiocabili.
- **Identità**: ogni universo ha un tema visivo **e** 1–2 meccaniche proprie (sezione 5). Temi proposti (da scegliere):

| Universo | Livelli | Tema proposto | Meccaniche nuove |
|---|---|---|---|
| 1 Atelier | 1–100 | quello attuale (atelier, frutta, animali… fantasia) | primari, secondari, ghiaccio, nascosti |
| 2 Natura | 101–200 | bosco, montagna, deserto, giungla, stagioni… | **marrone** (R+Y+B), **pietra** |
| 3 Viaggio | 201–300 | città del mondo, monumenti, feste, sport… | **lucchetto e chiave**, **secchiello coperto** |
| 4 Mare e cielo | 301–400 | abissi, isole, nuvole, uccelli, mongolfiere… | **pellicola colorata**, **secchielli collegati** |
| 5 Cosmo | 401–500 | pianeti, robot, sogni, mito… | **corsie cieche**, tele fino a 16×16, tutto insieme |

## 4. Distribuzione della difficoltà

Cinque fasce (nomi da allineare con #71, che fissa le soglie assolute sulla misura di #75):
**Tutorial · Facile · Normale · Difficile · Molto difficile (boss)**.

### 4.1 Regola "molto facile solo all'inizio"
- **Tutorial/molto facile solo nei livelli 1–8** (oggi sono ~20). Dal livello 9 nessun livello deve essere vinto quasi sempre a caso: vincolo verificabile in `gen:levels` (es. win rate casuale ≥ 95% vietato dopo il livello 8, salvo i livelli che introducono una meccanica nuova, che possono stare in "Facile").
- Gli stage 1–2 attuali vanno **ritoccati** (meno slot/nastro più basso negli ultimi livelli dello stage 2), in linea con le raccomandazioni di #29 e #75.

### 4.2 Tre denti di sega annidati
1. **Dentro lo stage (10 livelli)** — schema: `1 respiro · 2–3 base · 4 base+1 · 5–6 base · 7 base+1 · 8 base · 9 difficile "travestito" · 10 boss`.
2. **Dentro l'universo (100 livelli)** — gli stage 1–2 introducono la meccanica nuova con un calo; gli stage 9–10 sono i più duri; il livello 100 è il picco.
3. **Tra universi** — l'inizio dell'universo N+1 è più facile della fine di N ma più difficile dell'inizio di N (si impara la meccanica nuova, poi si sale).

### 4.3 Mix di fasce per universo (proposta, da tarare con #71 e i playtest)

| Universo | Tutorial | Facile | Normale | Difficile | Molto difficile | Note |
|---|---|---|---|---|---|---|
| 1 | 8% | 22% | 45% | 15% | 10% | i 10 boss |
| 2 | – | 15% | 45% | 28% | 12% | |
| 3 | – | 12% | 40% | 33% | 15% | |
| 4 | – | 10% | 35% | 37% | 18% | |
| 5 | – | 8% | 30% | 40% | 22% | |

- I "Facile" dopo l'universo 1 sono i livelli di respiro e quelli che insegnano una meccanica.
- **Livelli duri = più corti**: per Difficile/Molto difficile tetto di pixel o di secchielli (da stabilire con #71), così una sconfitta costa poco.
- **Leve di difficoltà** (già misurabili): fascia `winRate` con nastro+slot insieme (#75), tela, colonne, `ammoChunk`, slot, capienza nastro, numero di speciali, mosse della soluzione. Le meccaniche nuove entrano nella misura solo se il solver e `randomWinRate` le simulano (regole in `rules.ts`).

## 5. Nuove leve di difficoltà e interesse

### 5.1 Meccaniche di gioco (una nuova ogni ~2 stage)
Requisiti per ognuna: regola in una frase, implementata in `src/core/rules.ts` (condivisa da simulazione e solver), livelli verificati risolvibili, suggerimento una tantum al primo incontro (#77), resa grafica disegnata in codice (nessun asset di terzi).

| Meccanica | Regola in una frase | Perché funziona | Costo tecnico stimato |
|---|---|---|---|
| **Marrone** (terziario) | Un pixel marrone vuole **tutti e tre** i primari | Estensione naturale del mixing (bitmask 7); blocca la corsia più a lungo | Basso: `accepts` già lavora a bitmask; palette e mixing in `colors.ts`/`theme.ts` |
| **Ghiaccio doppio** | Due strati: due colpi del suo colore prima di dipingere | Variante di una regola già nota (respiro tra due novità) | Molto basso: `ice` conta già gli strati |
| **Pietra** | Cella fissa: la vernice si ferma lì e non passa | Cambia la geometria: alcune corsie si accorciano, l'ordine dei lati conta | Basso: `findTarget` si ferma sulla pietra |
| **Lucchetto e chiave** | I pixel col lucchetto si aprono quando il pixel chiave (stesso simbolo) è completo | Pianificazione a distanza (non solo vicini come i nascosti) | Medio: stato in `Board`, overlay nuovo |
| **Secchiello coperto** | Il colore si vede solo quando arriva in cima alla colonna | Rischio e memoria; varietà senza regole nuove sul quadro | Basso nel core; attenzione: il solver lo vede, il giocatore no → la misura sottostima la difficoltà |
| **Pellicola colorata** | Un pixel coperto da pellicola di un colore va prima "pulito" con quel primario | Come le scatole concentriche di Pixel Flow, ma legato al colore | Medio: strato con colore in `Board` |
| **Secchielli collegati** | Due secchielli uniti partono insieme | Meno controllo sull'ordine, più pressione su nastro e slot | Medio: `sim.ts` (`canBoard` con 2 posti) e solver |
| **Corsie cieche** | Un tratto del nastro passa in un tunnel e lì non spara | Cambia la geometria del nastro, non del quadro | Medio: `buildLanes`/layout e resa grafica |
| *(sconsigliata)* Nastro più veloce | Meno tempo per decidere | Aggiunge pressione di riflessi, contro il tono rilassato; il solver non la misura | — |

### 5.2 Leve di interesse (meta)
| Idea | Leva psicologica | Nota |
|---|---|---|
| **Murale dell'universo**: i 100 quadri formano un'unica grande immagine che si completa livello per livello; il primo pezzo è già dipinto | Zeigarnik, endowed progress, collezione | Estende l'album per stage (#40) e la galleria condivisibile (#15) |
| **Barre di avanzamento** universo (x/100) e stage (x/10) sulla mappa e a fine livello | Goal gradient | |
| **Universo successivo visibile ma chiuso**, con anteprima della prima immagine | Curiosità | Requisito della richiesta |
| **Etichetta "Difficile" / "Boss"** prima di iniziare | Aspettative giuste, sconfitta non vissuta come errore | Coincide con #73 |
| **Stelle 1–3** per livello (★ completato, ★★ senza "+1 slot", ★★★ entro N lanci) solo cosmetiche, non bloccano mai lo sblocco | Padronanza per chi vuole di più, rigiocabilità | N dal solver: oggi `solutionMoves` è *una* soluzione, non la minima → va verificato |
| **Feedback "quasi"** sulla sconfitta ("mancavano 3 pixel") | Near-miss onesto | Solo dati veri, mai pilotati |
| **Aiuto dopo 3 sconfitte** sullo stesso livello: un suggerimento (prossima colonna buona) o "+1 slot" gratis | DDA trasparente | Il livello non cambia; nessun aiuto nascosto |
| **Livello di respiro dopo ogni boss** | Ritmo del dente di sega | Già nello schema 4.2 |
| **Festa di fine universo**: animazione del murale completo + nuova skin + apertura del nuovo universo | Peak-end rule: il ricordo dipende dal picco e dalla fine | |
| **Skin per universo** (oltre a quelle per stage) | Ricompensa visibile | Oggi 11 skin, una per stage → servono ~40 nuove o un altro schema (es. 1 per universo + varianti di colore) |
| **Livello del giorno** pescato dagli universi già aperti | Abitudine | Esiste già #17 |

Paletti etici (da scrivere nel ticket epic): niente sconfitte truccate, niente timer che spingono all'acquisto, ricompense casuali solo cosmetiche e gratuite, ogni livello risolvibile e dimostrato dal solver.

## 6. Ticket proposti

Milestone nuova: **"500 livelli"** (dopo *Store release*). Etichette esistenti: `epic`, `feature`, `question`, `ux`, `testing`.

| # | Tipo | Titolo | Dipende da |
|---|---|---|---|
| E | epic | Epic: 500 livelli in 5 universi da 100, sblocco a fine universo | — |
| 1 | question | Research: curva di difficoltà 1–500 (fasce per universo/stage/livello, "facile solo nei primi 8") | #71, #75 |
| 2 | spike | Spike: prototipi delle nuove meccaniche nel core e costo per solver/`gen:levels` | — |
| 3 | feature | Core: modello "Universo" (dati, progressi, regola di sblocco) | #74 |
| 4 | feature, ux | UI: selettore universi, universi chiusi con anteprima, festa di sblocco, mappa per universo | 3 |
| 5 | feature | Scalabilità 500 livelli: `levels.json` per universo con caricamento pigro, mappa e cache PWA, tempi di `gen:levels` in CI | #74 |
| 6 | feature | Universo 1: ritocco della curva (molto facile solo 1–8, stage 2 più duro, anomalie #59/#50/#80) | 1, PR #86 |
| 7 | feature | Murale dell'universo e skin per universo | 3, #40 |
| 8 | feature, ux | Stelle 1–3 per livello (cosmetiche) | 3 |
| 9 | feature, ux | Sconfitta "quasi" e aiuto dopo 3 sconfitte | — |
| 10–13 | feature | Meccaniche: marrone + ghiaccio doppio, pietra, lucchetto/chiave, secchiello coperto, pellicola, collegati, corsie cieche (un ticket per meccanica o per coppia) | 2 |
| 14–17 | epic (sotto E) | Contenuti Universo 2 / 3 / 4 / 5: 10 stage, 100 immagini, nomi IT/EN, fasce secondo il ticket 1 | 1, 3, meccaniche del suo universo |
| 18 | testing | Playtest per universo (agent #66 + persone #42) prima di rilasciare ogni universo | 14–17 |

Ogni ticket di contenuto riusa la pipeline esistente: file `stage-NN.ts`, `npm run gen:levels` (fascia rispettata o livello rifiutato), `npm run preview:levels` per i fogli in `docs/levels/`, chiavi i18n con test di completezza.

## 7. Decisioni da prendere prima di creare i ticket
1. **Temi** dei 4 nuovi universi (tabella in sezione 3) e loro nomi.
2. **Meccaniche**: quali tenere, quali scartare (es. secchielli coperti e corsie cieche sono le più discutibili).
3. **Stelle** sì/no (aggiungono rigiocabilità ma anche una cosa in più da spiegare).
4. **Aiuto dopo 3 sconfitte**: gratis o legato al rewarded ad di #13.
5. **Ordine di rilascio**: un universo per aggiornamento (consigliato: meno rischio, playtest per universo) o tutti e 500 insieme.
6. **Pixel art**: 400 immagini a mano come oggi, oppure uno strumento interno che aiuti a disegnarle (resta grafica nostra, nessun asset di terzi).

## Limiti di questa ricerca
- Molte fonti di settore (gamedeveloper.com, mobilegamer.biz, playliner, arXiv, Wikipedia) non erano raggiungibili dal proxy: i dati vengono dagli estratti delle ricerche, non dagli articoli completi.
- Le percentuali del mix (4.3) sono una proposta: vanno tarate sulle soglie di #71 e sulla misura di #75, poi confermate con i playtest.

## Fonti
- [CrazyLabs — level design hyper casual](https://www.crazylabs.com/blog/the-must-have-of-level-design-in-hyper-casual-mobile-games/)
- [Smart & Casual: tile puzzle level design (Game Developer)](https://www.gamedeveloper.com/design/smart-casual-the-state-of-tile-puzzle-games-level-design-part-1)
- [Mobile Game Doctor — level creation per puzzle F2P](https://mobilegamedoctor.com/2025/05/30/illuminating-level-creation-for-free-to-play-puzzle-games/)
- [Royal Match: curva di difficoltà e near-loss (Playliner)](https://playliner.com/tpost/l8zzrb9el1-how-difficulty-curve-increases-retention)
- [Royal Match imita Candy Crush sui livelli super hard](https://popculturereferences.com/royal-match-is-emulating-candy-crush-saga-in-an-annoying-fashion/)
- [Come King definisce un buon livello di Candy Crush](https://mobilegamer.biz/how-king-defines-a-good-candy-crush-saga-level-and-why-it-constantly-prunes-the-bad-ones/)
- [Design Deep Dive: Royal Match](https://medium.com/ironsource-levelup/design-deep-dive-02-royal-match-948f7af96f04)
- [Flow in Games — Jenova Chen](https://www.jenovachen.com/flowingames/Flow_in_games_final.pdf)
- [Cognitive Flow (Game Developer)](https://www.gamedeveloper.com/design/cognitive-flow-the-psychology-of-great-game-design)
- [Gamification: goal gradient, Zeigarnik, rinforzi variabili](https://ogamic.com/blog/gamification-behavior-change)
- [Persuasive Mobile Game Mechanics for User Retention](https://www.researchgate.net/publication/336732512_Persuasive_Mobile_Game_Mechanics_For_User_Retention)
- [Rethinking Progression in Mobile Puzzle Games](https://www.gamedeveloper.com/design/rethinking-progression-in-mobile-puzzle-games)
- [Dynamic Difficulty Adjustment for Maximized Engagement](https://www.researchgate.net/publication/322414816_Dynamic_Difficulty_Adjustment_for_Maximized_Engagement_in_Digital_Games)
- [Difficulty Modelling in Mobile Puzzle Games (dati giocatori + simulazione)](https://arxiv.org/html/2401.17436v1)
- [Match-3: cadenza degli ostacoli](https://raijinnstudio.com/blog/match-3-game-development-guide-royal-match)
- [Pixel Flow: ostacoli e funzioni](https://pixel-flow.app/wiki/features) · [scheda App Store](https://apps.apple.com/us/app/pixel-flow/id6751056652)
- [Dark pattern nei giochi mobile](https://arxiv.org/pdf/2412.05039) · [Fair Patterns, 2025](https://www.fairpatterns.com/post/from-dark-patterns-to-fair-play-why-gaming-must-change-now)
