# Changelog

## Non rilasciato — universi da 100 livelli e sblocco a fine universo (#90)

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
