# Changelog

## Non rilasciato

### Stage 18 "Inverno": livelli 171–180 (#128)

- **Dieci figure in pixel art originale** sull'inverno (`scripts/stages/stage-18.ts`): abete, muffole, cioccolata calda, pupazzo di neve, pettirosso, slitta, renna, lanterna, volpe nella neve e il boss, la baita innevata (14×14). Foglio di anteprima in `docs/levels/stage-18.png`; nomi IT/EN.
- **Marrone + pietra + ghiaccio** in ogni livello, nessuna novità; nastro 2 e slot 2 in tutto lo stage. Legno e pellicce marroni, la neve in lilla; dalla seconda figura in poi ≥ 50% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): vittorie a caso 86 · 67 · 66 · 62 · 67 · 67 · 63 · 70 · 57 · 43%, media 64,7% (sotto il fiume, 69,4%, verso il ~62% di fine universo); nessun livello molto facile, il boss è il più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 171 si gioca fino alla vittoria.

### Stage 16 "Fiume": livelli 151–160 (#126)

- **Dieci figure in pixel art originale** sul fiume (`scripts/stages/stage-16.ts`): ninfea, trota, canoa, airone, libellula, anatra, martin pescatore, tife, lontra e il boss, il mulino ad acqua (14×14). Foglio di anteprima in `docs/levels/stage-16.png`; nomi IT/EN.
- **Pietra + ghiaccio** in ogni livello, niente marrone; nastro 2 e slot 2 in tutto lo stage. Dalla seconda figura in poi ≥ 40% di pixel secondari.
- **Curva** a dente di sega (#88): vittorie a caso 84 · 72 · 77 · 68 · 73 · 77 · 68 · 73 · 62 · 40%, media 69%; nessun livello molto facile, il boss è il più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 151 si gioca fino alla vittoria.

### Stage 15 "Giungla": livelli 141–150 (#125)

- **Dieci figure in pixel art originale** sulla giungla (`scripts/stages/stage-15.ts`): papaia, tucano, raganella, ara, orchidea, camaleonte, farfalla morpho, mango, pitone e il boss, il tempio perduto (14×14). Foglio di anteprima in `docs/levels/stage-15.png`; nomi IT/EN.
- **Debutto della pietra** (#95) al livello 141: la papaia è molto facile e ha due pietre disegnate a mano tra la polpa, dove un colpo si ferma per forza; il suggerimento compare una volta. Dal 142 le pietre stanno nei buchi e sui bordi delle figure. Nessun'altra meccanica nello stage; nastro 2 e slot 2 dopo il debutto.
- **Curva** (#88): vittorie a caso 100 · 79 · 74 · 70 · 75 · 75 · 69 · 78 · 61 · 48%, media 72,9%; solo il debutto è molto facile, il boss è il livello più duro. Dalla seconda figura ≥ 30% di pixel secondari. Ogni livello è dimostrato risolvibile dal solver.
- La build e2e `more-levels` non sostituisce più il 141 con un livello finto (tolta `e2e/fixtures/stone-debut.json`): il suggerimento della pietra si verifica sul 141 vero.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva) e sul debutto; e2e: il 141 mostra il suggerimento una volta, un colpo si ferma sulla pietra, il livello si vince.

### Stage 14 "Deserto": livelli 131–140 (#124)

- **Dieci figure in pixel art originale** sul deserto (`scripts/stages/stage-14.ts`): saguaro, dune, oasi, scorpione, fennec, serpente a sonagli, clessidra, piramide, avvoltoio e il boss, il cammello (14×14). Foglio di anteprima in `docs/levels/stage-14.png`; nomi IT/EN.
- **Marrone, ghiaccio e nascosti insieme** in ogni livello; nastro 2 e slot 2 in tutto lo stage. Dalla seconda figura in poi ≥ 30% di pixel secondari o marroni.
- **Curva** a dente di sega (#88): respiro 87%, base 80%, gradini 72,5%, difficile 66%, boss 50%; media dello stage 75% di vittorie a caso, nessun livello molto facile. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (nomi, tela, meccaniche, quota di secondari, regole della curva); e2e: il livello 131 si gioca fino alla vittoria.

### Stage 13 "Prato": livelli 121–130 (#123)

- **Dieci figure nuove in pixel art originale** sul tema del prato, terzo stage dell'universo 2 (Natura): margherita, tarassaco, alveare, cavalletta, cestino da picnic, aquilone, carriola, spaventapasseri, gallo e, come boss, il mulino a vento (14×14). Nomi in italiano e inglese.
- **Meccaniche**: marrone e pixel nascosti, nessuna novità. Nastro 2 come in tutto l'universo, slot 2 o 3.
- **Curva** (#88): dente di sega con margherita di respiro (92% di vittorie a caso), base 81%, scalini al 70% e 74%, gallo difficile al 64%, mulino boss al 56%; media dello stage 75,5%, nessun livello molto facile. Figure con il 67–95% di pixel secondari o marroni.
- Test: e2e che gioca il livello 121 fino alla vittoria; chiavi i18n e regole della curva coperte dai test esistenti su tutti i livelli.

### Stage 12 "Montagna": livelli 111–120 (#122)

- **Dieci figure nuove in pixel art**, disegnate a mano sul tema: scarpone, cima innevata, baita, marmotta, stella alpina, zaino, stambecco, funivia, aquila e, come boss, la vetta (14×14, la tela più grande dello stage). Nomi IT/EN.
- **Marrone + ghiaccio** in ogni livello: roccia, legno e pelo in marrone, il ghiaccio sui pixel primari. Nessuna meccanica nuova, quindi nessun livello molto facile: il respiro (111) si vince a caso nell'88% dei casi. Dopo il respiro ogni figura ha almeno il 30% di pixel misti o marroni. Nastro 2 e slot 2, mai sopra la fine dell'universo 1.
- **Curva** (#88, dente di sega dello stage): vittorie a caso 88 · 79 · 80 · 68 · 81 · 83 · 73 · 81 · 61 · 53%, media 75%; il boss è il livello più duro. Ogni livello è dimostrato risolvibile dal solver.
- Test: unit sullo stage (id e boss, nomi IT/EN, meccaniche, tela/nastro/slot, regole della curva); e2e: la vetta (120) si gioca fino alla vittoria.

### Stage 11 "Bosco": livelli 101–110 (#121)

- **Stage 11 completo**, primo dell'universo 2 (Natura): dopo la ghianda (101) arrivano porcino, abete, riccio, scoiattolo, nido, castoro, baita, cervo e la quercia (110, boss 14×14). Pixel art originale disegnata a mano, con il marrone nelle figure (tronchi, aculei, nidi, corna); unica meccanica dello stage il marrone.
- **Curva** (#88): dente di sega con il 109 difficile e il boss il più duro; solo il 101 è molto facile. Vittorie casuali 98 · 82 · 88 · 75 · 80 · 83 · 73 · 83 · 72 · 58%, media 79% (fine dell'universo 1: 65%, inizio: 97%). Nastro 2 e slot 2–3, mai sopra la fine dell'universo 1. Livelli 1–101 identici.
- Nomi IT/EN di tutti i livelli; foglio di anteprima `docs/levels/stage-11.png`.
- Test: unit sullo stage (completo, nomi, sola meccanica marrone, ≥ 30% di pixel da mescolare, nastro e slot, dente di sega, media tra fine e inizio dell'universo 1); e2e: la quercia (110) si gioca fino alla vittoria e resta salvata.

### Meccanica: pixel marrone (#94)

- **Marrone = rosso + giallo + blu**: un pixel marrone (codice `K` nelle immagini) è completo dopo tre colpi, uno per primario, in qualsiasi ordine; finché non arrivano tutti e tre blocca la sua corsia come gli altri pixel non finiti. Le munizioni e il solver contano il colpo in più; il generatore può piazzare pixel marroni in modo deterministico (`special.brown`).
- **Grafica**: marrone gouache `#8B5A3C`; un pixel marrone a metà mostra tre spicchi fissi (rosso in alto a sinistra, giallo in alto a destra, blu in basso) separati da divisori, così ciò che manca si legge dalla posizione e non solo dal colore.
- **Spiegazione**: suggerimento una tantum al primo livello con il marrone e quarta pagina di "Come si gioca" ("Rosso + giallo + blu = marrone"), in italiano e inglese. Per le regole della curva (#88) il marrone conta come pixel misto ed è una meccanica a sé, quindi il suo livello di debutto può essere molto facile.
- **Livello di debutto 101, "Ghianda"**: primo livello dello stage 11 (Bosco) e dell'universo 2 (Natura), che si apre finendo il livello 100. Lo stage e l'universo sono ancora in costruzione (#100); il 101 è molto facile (98% di vittorie a caso) e dimostrato risolvibile. Livelli 1–100 identici.
- Test: unit su regole (tre colpi in ordine qualsiasi, colore ripetuto rifiutato, corsia bloccata, rivelazione dei nascosti), formato e munizioni, solver e simulazione con le stesse regole, generatore deterministico, suggerimento, curva e spicchi; e2e: il suggerimento compare al 101 una volta sola e il livello si vince, quarta pagina di "Come si gioca".

### Meccanica: pietra (#95)

- **Pietra**: una cella fissa senza pixel in cui la vernice si ferma, senza passare oltre. I pixel dietro si dipingono da un altro lato del nastro; la pietra non conta per la vittoria. Debutto previsto al livello 141 (universo 2), con i contenuti di #100.
- **Formato livello**: codice `s` nell'`overlay`, solo su una cella vuota. `parseLevel` rifiuta, prima del solver e con un messaggio chiaro, una pietra su un pixel e un pixel murato su tutti e quattro i lati. La regola sta in `src/core/rules.ts` (`findTarget`), condivisa da gioco, `solve` e `levelWinRate`.
- **Generatore**: `special: { stone: N }` piazza N pietre in modo deterministico sulle celle vuote che toccano la figura (buchi o bordo), mai murando un pixel; le pietre si estraggono dopo ghiaccio e nascosti, quindi i livelli esistenti restano identici.
- **Grafica disegnata in codice**: blocco grigio smussato con puntini, riconoscibile senza colore a 14 px; un colpo fermato da una pietra fa uno schizzo grigio senza colore. Token `stone` e `stoneDark` in `src/game/theme.ts`.
- **Spiegazione**: suggerimento una tantum al primo livello con pietre e quarta pagina in "Come si gioca" (IT/EN).
- Test: unit su formato, raggiungibilità, regole, simulazione, solver, generatore deterministico, suggerimento e curva; e2e sul livello di debutto (141) nella build con più livelli: il suggerimento compare, un colpo si ferma sulla pietra, il livello si vince.

### Meccanica: secchiello coperto (#97)

- **Secchiello coperto**: un secchiello dietro il primo della sua colonna può essere coperto: mostra "?" sul colore del coperchio (token `hidden`, lo stesso dei pixel nascosti) e la sua vernice resta un segreto finché non arriva in cima. Lì si gira (animazione di 420 ms e un piccolo suono) e mostra il colore; da lì in poi resta scoperto. Le munizioni restano visibili.
- **Regole invariate**: il colore resta nel dato (`covered?: boolean` sullo `ShooterSpec`), quindi simulazione, `solve` e `levelWinRate` giocano il livello come prima; la regola di visibilità `colorShown` sta in `src/core/rules.ts`. `parseLevel` rifiuta un `covered` che non sia booleano e un primo secchiello coperto (non nasconderebbe niente).
- **Generatore**: `special.covered` è la quota di secchielli coperti (es. 0,25), scelti con il seme del livello e mai il primo di una colonna. I livelli esistenti non cambiano.
- **Suggerimento una tantum** al primo livello con secchielli coperti e **quarta scheda** in "Come si gioca" ("Sorpresa"), IT/EN.
- Il debutto vero (livello 241) arriva con l'universo 3 (#101). Il livello di debutto è già pronto come spec (`e2e/fixtures/covered-debut.ts`, fascia "molto facile") e lo serve la build e2e `--mode covered-debut`. La difficoltà è solo umana: va confermata col playtest (#66) prima di rilasciare l'universo 3.
- Test: unit su formato, regola, generatore deterministico (quota, mai il primo di colonna, errori), solver e probe invariati, suggerimento; e2e sul livello di debutto (suggerimento, "?" nelle colonne, colore scoperto in cima, vittoria) e su tutte e quattro le schede di "Come si gioca".

### Murale dell'universo e skin per universo (#92)

- **Murale**: ogni universo ha un grande quadro diviso in 100 tessere, disegnato in codice con i colori del gioco (Atelier: ruota dei colori; Natura, Viaggio, Mare e cielo, Cosmo per i prossimi). La tessera N si colora completando il livello N dell'universo; la prima è già dipinta quando l'universo si apre. Prende il posto dei segnaposto nella card del selettore, nell'album e nella festa di fine universo (le tessere si aggiungono una alla volta).
- **Album per universo**: una pagina per universo con il murale, l'avanzamento "Murale x/100", un pulsante per ogni stage (✓ se completo) e lo stile dell'universo da vincere; frecce ‹ › per passare da un universo all'altro (anche quelli chiusi, vuoti e col lucchetto). Si apre dal pulsante "Album" del selettore o con ◀ dalla pagina di uno stage, che ora sfoglia solo gli stage del suo universo.
- **Skin per universo**: gli universi 2–5 hanno uno stile nuovo ciascuno (fiori, francobolli, bolle, orbite), sbloccato finendo l'universo e mostrato nella festa; ogni stage completato del suo universo sblocca una variante di colore (solo cambio di palette, 10 per universo). L'universo 1 tiene i suoi 10 stili per stage. I colori sono token nuovi in `src/game/theme.ts` (`gold`, `SKIN_COLORS`, `MURAL_PAINT`).
- **Salvataggi compatibili**: gli stili già guadagnati restano validi; uno stile non guadagnato in un salvataggio torna a "classico". Livelli identici.
- Test: unit su murale (tessere = livelli completati dell'universo + tessera regalo, universo chiuso vuoto, tessere dei livelli che non esistono ancora), skin e varianti secondo i progressi, salvataggi con skin non guadagnate; e2e a 360×640 e 412×915 sulla build con 205 livelli (completare un livello colora la sua tessera nel selettore e nell'album, album per universo, variante sbloccata dal primo stage dell'universo 2, stile dell'universo nella festa), con il controllo "niente fuori schermo" sulle schermate nuove.

## 0.5.0 — universi: selettore, mappa per universo e festa di fine universo (29 ottobre 2026)

Il gioco ora è organizzato in **universi** da 100 livelli: oggi c'è l'universo 1 (Atelier), con i 100 livelli di sempre, e tutto è pronto per i prossimi. La mappa mostra un universo alla volta, con il suo avanzamento x/100; un selettore elenca gli universi, anche quelli ancora chiusi, e finire l'ultimo livello di un universo apre una festa. **I progressi restano validi** e i livelli non cambiano.

### Selettore degli universi, mappa per universo e festa di fine universo (#91)

- **Selettore degli universi**: si apre dalla barra sotto il titolo della mappa. Una card per universo con nome, colore, avanzamento x/100 e il primo quadro come anteprima. Un universo chiuso resta visibile (lucchetto, sagoma del quadro, "Completa il livello N per aprire"); toccarlo lo scuote e spiega cosa manca, senza aprirlo.
- **Mappa per universo**: solo i livelli dell'universo scelto (al massimo 100 nodi); si apre sull'universo del livello corrente. "Altri livelli in arrivo" solo sull'ultimo universo in costruzione.
- **Barre di avanzamento**: universo x/100 nella barra del titolo della mappa e nel pannello di vittoria, con "+1" alla prima vittoria; stage x/10 nelle fasce come prima.
- **Festa di fine universo**: vincendo l'ultimo livello di un universo, il pulsante porta alla festa: i quadri dell'universo si compongono in un mosaico, poi l'universo successivo si apre con "Vai all'universo N+1" (o "Un nuovo universo è in arrivo"). Una volta sola; si rivede dall'album dell'ultimo stage. Murale vero e skin nuova arrivano con #92.
- La tabella degli universi passa in `scripts/universes.ts`; `npm run gen:levels` la scrive in `src/levels/universes.json` (verificata da `--check`). Livelli identici.
- Test: unit sul selettore (card, layout, universo della mappa, universo appena completato); e2e a 360×640 e 412×915 su una build con 205 livelli (universo chiuso non selezionabile, festa una sola volta e rivista dall'album, mappa dell'universo 2 dal 101); il selettore è nel controllo "niente fuori schermo" su tutti i formati.

### Universi da 100 livelli e sblocco a fine universo (#90)

- **Universi nel core**: `src/core/universes.ts` (puro) con la tabella `UNIVERSES` (nome, colore del tema, tela massima) e le regole: un universo è una serie di 10 stage; l'universo N+1 si apre solo completando l'ultimo livello dell'universo N. Funzioni: `universeOf`, `universeLevels`, `lastLevelOf`, `isUniverseUnlocked`, `canOpenLevel`.
- **Il core rifiuta i livelli chiusi**: la scena di gioco apre un livello solo se `canOpenLevel` lo permette, e i salvataggi modificati a mano perdono i completati e lo sblocco oltre gli universi aperti. Chi ha finito i 100 livelli di oggi troverà aperto il livello 101 quando arriverà l'universo 2.
- **Validazione** in `npm run gen:levels`: ogni stage in un universo della tabella, solo l'ultimo universo incompleto, figure entro la tela del loro universo (14×14 fino all'universo 4, 16×16 al massimo).
- Testi IT/EN: `universe.atelier`, `universe.locked` ("Completa il livello {n} per aprire"). Oggi c'è un solo universo: in gioco non cambia nulla, livelli identici.
- Test: 1, 2 e 5 universi, universo incompleto, id non multipli di 100, salvataggio di 100 livelli su un gioco da 200, salvataggi manomessi, tela 17×17 rifiutata; e2e su una build con 205 livelli (`--mode more-levels`, ora con un universo 2 completo): un salvataggio manomesso non apre il 101 senza il 100.
- Regola "come si aggiunge un universo" in `docs/strategia-progetto.md`.

## 0.4.0 — curva di difficoltà ricalibrata e contenuti scalabili (28 ottobre 2026)

Sempre 100 livelli in 10 stage, con la difficoltà rifatta: misurata con le regole vere del gioco, controllata da regole automatiche, e "molto facile" solo nei primi livelli. Molti livelli cambiano (inventari dei secchielli, nastro, slot e 29 figure ridisegnate), ma id e nomi restano gli stessi: **i progressi restano validi**. In più: capienza del nastro visibile, progressi al sicuro tra un aggiornamento e l'altro, layout adattivo a ogni schermo e un gioco pronto a ricevere nuovi stage.

### Universo 1: "molto facile" solo nei primi livelli (#89)

- **Livelli molto facili da 55 a 17** (≥ 95% di vittorie per il giocatore casuale): restano solo l'introduzione (1–8) e il primo livello di ogni stage. Le regole della curva (#88) passano senza errori: `scripts/stages/curve-known.ts` è vuoto.
- **Curva per stage** (media vittorie casuali): 97, 89, 88, 85, 79, 76, 74, 68, 64, 65%. Stage 1: 9–10 con 2 slot. Stage 2: nastro 3 e slot 2 dopo il respiro. Il faro (boss 50) ora è il più duro del suo stage e lo stage 8 è più duro del 7.
- **29 figure ridisegnate** (cornice di un altro colore o più colori secondari), stessi soggetti e nomi: frutti dello stage 2, ape, lumaca, cane, foglia, carota, granchio, barca, faro, lampione, ponte, fontana, caramella, pizza, autobus, camion, treno, elicottero, scooter, sottomarino, luna, razzo.
- 45 livelli cambiano, 55 identici; **id, nomi e numero dei livelli invariati, i progressi restano validi**.
- Test: al massimo 17 livelli molto facili, solo intro e primi di stage; nessuna fascia oltre l'introduzione che arrivi al 95%. Report prima/dopo: `docs/reports/2026-10-05-curva-universo-1.md`.

### Contenuti scalabili: niente più limiti fissi di 10 stage / 100 livelli (#74)

- **Uno stage nuovo è un file nuovo**: `scripts/stages/index.ts` trova da solo i `stage-NN.ts`; chiave del nome e colore della fascia stanno nel file dello stage, non più in una tabella di 10 voci in `src/core/stages.ts`.
- `npm run gen:levels` scrive anche `src/levels/stages.json` (chiave, colore, completo o no), letto da mappa e album; `--check` verifica anche questo file. I livelli **non cambiano** (`levels.json` identico).
- "Altri livelli in arrivo" compare quando l'ultimo stage non è completo, non più con un conto su 100. L'album sfoglia tutti gli stage che esistono; uno stage senza skin non mostra il premio, e completarlo non promette uno stile nuovo.
- Solo l'ultimo stage può essere incompleto: così gli id dei livelli non cambiano mai e i **salvataggi restano validi** dopo un aggiornamento; chi aveva finito il gioco trova aperto il primo livello nuovo.
- Test: 1, 10, 11 e 12 stage, stage da 5 livelli, totali non multipli di 10, salvataggio di 100 livelli su un gioco da 110; e2e su una build con 115 livelli (`--mode more-levels`): salvataggio finito che apre il primo livello nuovo, stage 11 completato, album dello stage in costruzione. Gli e2e che usavano il livello 100 usano l'ultimo livello.
- Regola "come si aggiunge uno stage" in `docs/strategia-progetto.md`.

### Regole automatiche della curva di difficoltà (#88)

- **Curva controllata da regole**, non a occhio: `src/core/curve.ts` (puro, soglie in una sola tabella) verifica che "molto facile" (≥ 95% a caso) resti nei livelli 1–8, nei primi livelli di stage dell'universo 1 e ai debutti di una meccanica; il dente di sega dentro lo stage (respiro, base, gradini, livello duro, boss il più duro salvo eccezioni dichiarate); la fine di ogni universo più dura dell'inizio; l'inizio di un universo tra la fine e l'inizio del precedente; gli obiettivi provvisori di fine universo; nastro 1 o slot 1 solo sui boss dall'universo 3, mai insieme. Pochi colori secondari e livelli duri troppo lunghi sono avvisi.
- `npm run gen:levels` stampa errori e avvisi e fallisce su un errore nuovo; `scripts/difficulty-report.ts` mostra la curva per universo. Funziona con N universi e stage incompleti.
- I livelli **non cambiano**. Gli errori già presenti nell'universo 1 (troppi livelli molto facili, dente di sega irregolare) sono elencati in `scripts/stages/curve-known.ts` e li corregge #89.

### Difficoltà con nastro e slot, curva ricalibrata (#75)

- **Misura nuova**: la difficoltà di un livello (`levelWinRate`) si misura con 200 partite giocate tick per tick con le regole vere del gioco: un giocatore casuale lancia appena il nastro ha posto. Capienza del nastro e slot d'attesa ora pesano insieme; prima si simulava un secchiello alla volta (come un nastro da 1).
- **Curva nuova**: nastro e slot scendono a gradini per stage — stage 3–4 nastro 3 (boss 2), stage 5–7 nastro 3 e poi 2 verso il boss, stage 8–10 nastro 2; slot mai sotto 2. Con la misura nuova la media di vittorie casuali scende da 94% (piatta negli stage 3–10) a 94% → 69% (stage 3 → 10), con livelli di respiro a inizio stage.
- **Livelli rigenerati dagli stage 3 in poi**: stesse immagini, stessi id e nomi, quindi **i progressi restano validi**; cambiano però gli **inventari dei secchielli** (colori, colpi e ordine nelle colonne), la capienza del nastro e in diversi livelli gli slot. Stage 1–2 identici.
- Test: misura deterministica, nastro più piccolo o meno slot mai più facili, ogni livello nella fascia della sua spec, curva che sale a gruppi di stage, nastro che non torna a crescere. Report prima/dopo: `docs/reports/2026-10-02-curva-nastro-slot.md`.
- Limite: il giocatore casuale non è una persona; la difficoltà percepita va confermata con i playtest (#66, #42).

### Capienza del nastro visibile (#76)

- **Indicatore del nastro** sulla riga "Attesa", a sinistra: "NASTRO 1/2" più un segnaposto per posto (pieno/vuoto: forma e numero, non solo colore), più scuro quando il nastro è pieno. L'occupazione (`beltLoad`, `beltFull`) viene da `src/core/sim.ts`.
- **Tocco rifiutato non più silenzioso**: se il nastro è pieno, la colonna o lo slot toccato fa una breve scossa, l'indicatore si evidenzia e c'è un suono sobrio sintetizzato.
- **Suggerimento una tantum "Nastro pieno"** la prima volta che il limite blocca un tocco (ogni livello ha un limite), con la capienza del livello; salvato con gli altri suggerimenti. Testi IT/EN.
- Test: unit su occupazione del nastro e suggerimento; e2e a 360×640 sul livello 71 (nastro da 2): tocco rifiutato senza lancio, suggerimento mostrato e ricordato, indicatore che non tocca l'etichetta "Attesa".

### Progressi al sicuro e layout adattivo

- **Progressi al sicuro (#64)**: le build debug dell'APK hanno ora una firma fissa e un `versionCode` crescente, quindi un nuovo APK si installa **sopra** il precedente senza perdere i dati (il primo con la nuova firma richiede una sola disinstallazione). Regole di backup Android esplicite. In Impostazioni → *Backup e azzeramento*: codice di salvataggio da copiare e incollare (con controllo di integrità, conferma se è più vecchio dei progressi attuali) e *Azzera i progressi* con conferma, l'unico modo in cui i dati si cancellano (lingua e audio restano).
- **Layout adattivo (#62)**: l'altezza del gioco segue lo schermo (1280–1900); nel livello i comandi (slot e colonne) stanno ancorati al bordo basso, vicino al pollice, e la tela cresce e si centra nello spazio libero; Come si gioca e Album ancorano pulsanti e testi in basso; area di tocco degli slot proporzionale alla scala reale (≥ 44 px anche a 280 px di larghezza); il ridimensionamento della finestra ricalcola la scena corrente senza perdere partita, pagina o scroll. Tablet e finestre larghe: gioco verticale centrato con bande laterali.
- **Schermo intero su Android**: il gioco si misura sull'area davvero libera (finestra meno barra di stato/navigazione e notch, via `--safe-area-inset-*` o `env()`), e si ricalcola quando le barre cambiano; altezza massima 1700 (oltre, bande laterali invece di un layout allungato); "Come si gioca" meno stirato. Nelle Impostazioni una riga piccola mostra le misure della finestra per la diagnosi.
- Test (#57): matrice di 10 formati di schermo in e2e (nessun elemento fuori schermo, comandi nella metà bassa, bersagli ≥ 44 px, screenshot come artefatti), unit test della funzione di layout per ogni altezza, test e2e del backup/reset.

### Test su logica, PWA e APK (#63)

- Logica spostata dalle scene a `src/core` e coperta da unit test: tocco sulla mappa (`mapTapTarget`), tasti di scroll, pagine e swipe di Come si gioca (`howto.ts`), azzeramento (`resetProgress`), decisione di ridimensionamento (`relayoutAction`).
- Test e2e del service worker/PWA: installazione, precache, apertura offline con i progressi intatti, modifiche fatte offline.
- Smoke test dell'APK su emulatore Android in CI: avvio fino alla mappa, canvas dentro l'area libera, firma uguale alla chiave debug committata, aggiornamento sopra la stessa versione con progressi conservati.
- Tolta la riga di diagnosi dalle Impostazioni.

### Prestazioni e QA (epic #44)

- **Mappa più fluida su APK** (#60, #46): nodi e fasce in pochi `Graphics`, etichette create solo quando entrano nello schermo e nascoste fuori, un solo hit-test sul tocco al posto di ~110 zone interattive.
- **Gioco**: i testi dei secchielli si aggiornano solo se cambiano (#45); i pixel si ridisegnano una volta per frame (#48); la soluzione si calcola solo quando serve (#48).
- Avvio: Phaser in un chunk separato (#47).
- Salvataggi: `unlocked` riconciliato con i livelli completati e limitato a 1–100, id fuori range e array enormi scartati, stile non sbloccato ignorato (#53, #54).
- Mappa: scroll con rotella e tastiera (#51); zone di tocco dei pulsanti ≥ 88 unità (#49); testi piccoli e contrasto migliorati (#50).
- Test: attese e2e legate ai tick di simulazione (#55), config Playwright/CI con report, trace e retry (#56), nuovi test (italiano, rotella, secchielli in parallelo, secondo ingorgo) e soglie di coverage alzate (#58).
- Rifiniture (#52): stella del boss 100 non più coperta dalla barra, invito a ruotare il telefono in orizzontale (web/PWA), guida del livello 1 con testo sotto il titolo e mano sotto la colonna, Come si gioca centrato, icona audio spento = nota sbiadita e più distante da ⟲, "Stage" → "Mondo" in italiano.
- Come si gioca: scorri tra le pagine con swipe, frecce o toccando i puntini; ogni apertura riparte dalla prima pagina (Phaser conservava i dati dell'ultima apertura).
- Release: un tag senza `-rc` crea una release normale, e una già esistente viene aggiornata (#59).

## 0.3.0 — 100 livelli in 10 stage (1 ottobre 2026)

### Novità di gioco
- **100 livelli** (prima 15), in **10 stage tematici da 10**: Atelier, Frutta, Animali, Giardino e fiori, Mare, Città ed edifici, Cibo e dolci, Veicoli, Spazio, Fantasia. 85 immagini nuove in pixel art originale; i 15 quadri esistenti sono stati ridistribuiti negli stage del loro tema.
- **Livello boss** (★) ogni 10: il 10° di ogni stage è più grande e difficile; il 100 è il drago.
- **Pixel ghiacciati** (dallo stage 4): servono due colpi del loro colore.
- **Pixel nascosti** (dallo stage 6): "?" che blocca la corsia finché un vicino non è completo.
- **Nastro corto** nello stage 8: al massimo 2 secchielli insieme.
- **Mappa a stage** scorrevole, con intestazione e avanzamento per stage; si apre sul livello a cui sei arrivato.
- **Album degli stage**: i quadri dipinti di ogni stage, silhouette per quelli mancanti. Completando uno stage si sblocca uno **stile per i secchielli** (10 stili: pois, righe, macchie, foglie, onde, scacchi, codette, strisce da corsa, stelle, oro).
- Suggerimenti illustrati per ghiaccio e pixel nascosti, in inglese e italiano.

### Sotto il cofano
- Livelli organizzati per stage (`scripts/stages`), generazione incrementale e verificata in CI, fogli di anteprima della pixel art (`docs/levels`).
- Regole di colpo condivise tra simulazione e solver; ogni livello rilasciato ha una soluzione verificata nella simulazione.
- Difficoltà calibrata per posizione nello stage, con un minimo di 6 secchielli dallo stage 3 (niente livelli con pochi secchielli giganti).
- **Correzione**: il solver poteva indicare lo slot d'attesa sbagliato in una soluzione con rilanci; ora gli slot sono gestiti per posizione come nel gioco.

### Attenzione
- L'ordine dei livelli è cambiato rispetto alla 0.2: i progressi salvati nelle versioni di prova si riferiscono ai vecchi livelli. Se la mappa sembra strana, reinstalla l'app o cancella i dati del sito.

## 0.2.0 — Lingue e tutorial
- Inglese di default, italiano dalle Impostazioni (⚙).
- Livello 1 guidato, suggerimenti una tantum (mixing, corsia bloccata, slot), schermata "Come si gioca".

## 0.1.0 — MVP
- Meccanica base: secchielli di colori primari sul nastro, mixing sulla tela, slot d'attesa, ingorgo con +1 slot.
- 15 livelli verificati dal solver, mappa, salvataggio, PWA e APK Android di debug.
