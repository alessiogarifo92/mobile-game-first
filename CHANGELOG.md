# Changelog

## Non rilasciato — prestazioni e QA (epic #44)

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
