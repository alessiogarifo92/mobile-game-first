# Changelog

## Non rilasciato — capienza del nastro visibile (#76)

- **Indicatore del nastro** sulla riga "Attesa", a sinistra: "NASTRO 1/2" più un segnaposto per posto (pieno/vuoto: forma e numero, non solo colore), più scuro quando il nastro è pieno. L'occupazione (`beltLoad`, `beltFull`) viene da `src/core/sim.ts`.
- **Tocco rifiutato non più silenzioso**: se il nastro è pieno, la colonna o lo slot toccato fa una breve scossa, l'indicatore si evidenzia e c'è un suono sobrio sintetizzato.
- **Suggerimento una tantum "Nastro pieno"** la prima volta che il limite blocca un tocco (ogni livello ha un limite), con la capienza del livello; salvato con gli altri suggerimenti. Testi IT/EN.
- Test: unit su occupazione del nastro e suggerimento; e2e a 360×640 sul livello 71 (nastro da 2): tocco rifiutato senza lancio, suggerimento mostrato e ricordato, indicatore che non tocca l'etichetta "Attesa".

## Non rilasciato — progressi al sicuro e layout adattivo

- **Progressi al sicuro (#64)**: le build debug dell'APK hanno ora una firma fissa e un `versionCode` crescente, quindi un nuovo APK si installa **sopra** il precedente senza perdere i dati (il primo con la nuova firma richiede una sola disinstallazione). Regole di backup Android esplicite. In Impostazioni → *Backup e azzeramento*: codice di salvataggio da copiare e incollare (con controllo di integrità, conferma se è più vecchio dei progressi attuali) e *Azzera i progressi* con conferma, l'unico modo in cui i dati si cancellano (lingua e audio restano).
- **Layout adattivo (#62)**: l'altezza del gioco segue lo schermo (1280–1900); nel livello i comandi (slot e colonne) stanno ancorati al bordo basso, vicino al pollice, e la tela cresce e si centra nello spazio libero; Come si gioca e Album ancorano pulsanti e testi in basso; area di tocco degli slot proporzionale alla scala reale (≥ 44 px anche a 280 px di larghezza); il ridimensionamento della finestra ricalcola la scena corrente senza perdere partita, pagina o scroll. Tablet e finestre larghe: gioco verticale centrato con bande laterali.
- **Schermo intero su Android**: il gioco si misura sull'area davvero libera (finestra meno barra di stato/navigazione e notch, via `--safe-area-inset-*` o `env()`), e si ricalcola quando le barre cambiano; altezza massima 1700 (oltre, bande laterali invece di un layout allungato); "Come si gioca" meno stirato. Nelle Impostazioni una riga piccola mostra le misure della finestra per la diagnosi.
- Test (#57): matrice di 10 formati di schermo in e2e (nessun elemento fuori schermo, comandi nella metà bassa, bersagli ≥ 44 px, screenshot come artefatti), unit test della funzione di layout per ogni altezza, test e2e del backup/reset.

## Non rilasciato — test su logica, PWA e APK (#63)

- Logica spostata dalle scene a `src/core` e coperta da unit test: tocco sulla mappa (`mapTapTarget`), tasti di scroll, pagine e swipe di Come si gioca (`howto.ts`), azzeramento (`resetProgress`), decisione di ridimensionamento (`relayoutAction`).
- Test e2e del service worker/PWA: installazione, precache, apertura offline con i progressi intatti, modifiche fatte offline.
- Smoke test dell'APK su emulatore Android in CI: avvio fino alla mappa, canvas dentro l'area libera, firma uguale alla chiave debug committata, aggiornamento sopra la stessa versione con progressi conservati.
- Tolta la riga di diagnosi dalle Impostazioni.

## 0.3.1 (non ancora rilasciato) — prestazioni e QA (epic #44)

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
