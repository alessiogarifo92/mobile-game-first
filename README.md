# Mix & Splash

Puzzle casual per smartphone: dipingi immagini in pixel art mandando secchielli di vernice su un nastro che gira attorno alla tela. Hai **solo rosso, giallo e blu**: arancione, verde e viola li ottieni **mescolando sulla tela**.

- **100 livelli** in **10 stage tematici** da 10 (Atelier, Frutta, Animali, Giardino, Mare, Città, Cibo e dolci, Veicoli, Spazio, Fantasia)
- Gioco offline, nessun account, nessuna pubblicità (per ora)
- Inglese di default, italiano disponibile
- Android (APK), web/PWA; iOS previsto (vedi [Store](#verso-gli-store))

Novità versione per versione: [`CHANGELOG.md`](CHANGELOG.md).

---

## Come si gioca

### Lo scopo
Completa il quadro: ogni pixel deve diventare del colore indicato. Il colore che un pixel vuole è suggerito dal quadratino sbiadito al suo centro.

### Le regole
1. **Lancia.** Tocca una colonna in basso: il primo secchiello sale sul nastro e fa un giro completo attorno alla tela.
2. **Spara.** A ogni corsia (riga o colonna) il secchiello spara verso l'interno. La vernice **vola sopra i pixel finiti** e si ferma sul **primo pixel non finito**. Lo colpisce solo se a quel pixel serve proprio quel colore; altrimenti la corsia è **bloccata** e il secchiello non spreca colpi.
3. **Mescola.** I pixel arancioni vogliono rosso + giallo, i verdi giallo + blu, i viola rosso + blu, in qualsiasi ordine. Un pixel a metà mostra il primo colore ricevuto come un triangolo.
4. **Aspetta.** Se dopo il giro il secchiello ha ancora vernice, va in uno **slot d'attesa**. Toccalo per rilanciarlo.
5. **Ingorgo.** Se un secchiello torna e tutti gli slot sono pieni, il nastro si blocca. Puoi aggiungere **+1 slot** (una volta per livello) o riprovare.

Ogni colore ha anche un simbolo (● rosso, ▲ giallo, ■ blu), così il gioco è leggibile anche per chi distingue male i colori.

### Meccaniche speciali
| Elemento | Da dove | Come funziona |
|---|---|---|
| **Pixel ghiacciato** (crepe azzurre) | stage 4 | Vuole due colpi del suo colore: il primo rompe il ghiaccio, il secondo lo dipinge. Finché è ghiacciato blocca la corsia. |
| **Pixel nascosto** ("?") | stage 6 | Blocca la corsia e non mostra il colore finché un pixel accanto (sopra, sotto, a destra o a sinistra) non è completo. |
| **Nastro corto** | stage 8 | Al massimo 2 secchielli sul nastro insieme. |

### Stage, boss e album
- La mappa si scorre trascinando ed è divisa in stage: ogni stage ha un'intestazione con nome e avanzamento (es. "7/10").
- Il **10° livello di ogni stage è il boss** (★): più grande e difficile.
- Tocca l'intestazione di uno stage per aprire il suo **album**: i quadri dipinti a colori, quelli mancanti in silhouette.
- **Completando uno stage** sblocchi uno **stile per i secchielli** (pois, righe, onde, stelle, oro…); lo scegli dall'album.
- Ogni universo ha un **murale** da 100 tessere: la tessera N si colora completando il livello N (la prima è un regalo). Lo vedi nel selettore degli universi, nell'album (una pagina per universo, con i suoi stage) e nella festa di fine universo. Dall'universo 2 ogni stage completato sblocca una variante di colore dello stile dell'universo, e finire l'universo sblocca lo stile vero e proprio.

### Primo accesso e impostazioni
- Il **livello 1 è guidato**: evidenzia la colonna da toccare e accompagna i primi lanci.
- Ogni meccanica nuova (mixing, corsia bloccata, slot, ghiaccio, nascosti) è spiegata **una sola volta**, con un'illustrazione, la prima volta che compare.
- **Impostazioni** (⚙ nella mappa): lingua (English / Italiano), suono, **Come si gioca** (3 schede), **Rivedi il tutorial**.
- I progressi sono salvati sul dispositivo.

---

## Installare e provare

### APK Android
- **Dalla Release (consigliato)**: GitHub → **Releases** → l'ultima release (es. `v0.5.0`) → scarica `mix-and-splash-…-debug.apk` direttamente dal telefono e aprilo.
- **Da ogni push**: GitHub → **Actions** → *Android APK* → **Artifacts** → `mix-and-splash-debug-apk` (uno zip con `app-debug.apk`).

Android chiederà di consentire l'installazione da "origini sconosciute" per l'app usata (Files o Chrome): consentila solo per questa installazione.

Per pubblicare una nuova pre-release: GitHub → Actions → *Android APK* → **Run workflow**, scegli il branch e scrivi la versione (es. `v0.5.0-rc.1`); in alternativa pusha un tag di versione. Il workflow compila l'APK e crea la release con le note della sezione corrispondente di `CHANGELOG.md`.

È una build di **debug** (firmata con la chiave di debug): va bene per i test, non per il Play Store.

### Nel browser
`npm run dev` e apri http://localhost:5173 (dal telefono sulla stessa rete: `http://<IP-del-PC>:5173`). La build (`npm run build`) è una PWA: da Chrome su Android si può "Aggiungere alla schermata Home" e giocare offline.

---

## Sviluppo

### Stack
| Parte | Scelta |
|---|---|
| Motore 2D | Phaser 4 |
| Linguaggio e build | TypeScript (strict) + Vite |
| Test | Vitest (unit, coverage v8) + Playwright (e2e su viewport Pixel 7) |
| PWA | vite-plugin-pwa |
| App Android | Capacitor 8 (stessa build web in una WebView) |
| CI | GitHub Actions: lint, typecheck, controllo livelli, unit + coverage, build, e2e, APK |

Nessun asset di terzi: grafica disegnata via codice, suoni sintetizzati con Web Audio, pixel art originale.

### Comandi
Dalla root del repo, nella shell del tuo computer (Node 22):

```bash
cd /percorso/di/mobile-game-first
npm ci                       # dipendenze
npm run dev                  # gioco in sviluppo su http://localhost:5173
npm test                     # unit test
npm run test:coverage        # unit test + coverage di src/core (soglie in vitest.config.ts)
npm run test:e2e             # Playwright: builda e prova il gioco nel browser
npm run lint && npm run typecheck
npm run build                # build web + PWA in dist/
npm run gen:levels           # rigenera i livelli cambiati (--force: tutti, --check: solo verifica)
npm run preview:levels       # fogli di anteprima della pixel art in docs/levels/
npm run android:sync         # build web + copia nel progetto Android
```

APK in locale (serve Android SDK + JDK 21): `npm run android:sync`, poi `cd android && ./gradlew assembleDebug`; l'APK è in `android/app/build/outputs/apk/debug/`.

### Struttura
```
src/
  core/            regole del gioco, pure (niente Phaser/DOM), coperte da unit test
    colors.ts        primari come bitmask, mixing
    level.ts         formato livello, parsing e validazione (munizioni esatte)
    rules.ts         colpo, ghiaccio, nascosti: condivise da simulazione e solver
    sim.ts           simulazione deterministica a tick (nastro, slot, ingorgo)
    solver.ts        prova di risolvibilità (DFS) + win-rate di un giocatore casuale
    generator.ts     code di secchielli, piazzamento ghiaccio/nascosti, scarto dei livelli non provati
    stages.ts        stage letti dai dati, validazione, id/boss, hash delle specifiche
    universes.ts     universi da 10 stage, sblocco a fine universo, tela massima
    universeMenu.ts  selettore degli universi: card, layout, universo della mappa, fine universo
    mapLayout.ts     geometria della mappa scorrevole
    album.ts         avanzamento per stage, stili per stage e per universo sbloccati
    mural.ts         murale dell'universo: disegno in codice e tessere dipinte
    onboarding.ts    tutorial guidato e suggerimenti una tantum
    i18n.ts          testi en/it
    progress.ts      salvataggio (resiste a dati corrotti o storage non disponibile)
    layout.ts        geometria della schermata di gioco
  game/            rendering Phaser: scene Menu (mappa di un universo), Universes (selettore), Play, UniverseEnd (festa), HowTo, Album; tema, audio, skin
  levels/levels.json   i livelli generati (committati)
  levels/stages.json   chiave, colore e completezza di ogni stage (generato)
scripts/
  stages/stage-NN.ts   specifiche dei livelli, una per stage (pixel art + parametri), trovate da sole
  gen-levels.ts        generazione incrementale e verificata
  preview-levels.ts    fogli di anteprima
  render-icons.ts      icone PWA/Android e splash dall'SVG
e2e/               test Playwright
android/           progetto Capacitor
docs/              strategia, design, report, anteprime livelli, evidenze dei test
```

### Come funziona un livello
Un livello è un'immagine di caratteri (`R Y B O G P`, `K` = marrone, cioè rosso + giallo + blu; `.` = vuoto), un `overlay` opzionale (`i` ghiaccio, `h` nascosto) e le colonne di secchielli. Le munizioni di ogni colore sono **esattamente** quelle che servono: non ci sono colpi sprecati per costruzione.

La generazione (`npm run gen:levels`), per ogni specifica:
1. divide la vernice necessaria in secchielli, li mescola nelle colonne (con un seed) e, se richiesto, piazza ghiaccio e pixel nascosti;
2. accetta il risultato solo se il **solver** dimostra che è risolvibile (cercando una sequenza vincente);
3. misura la difficoltà come **percentuale di vittorie di un giocatore che tocca a caso** e la confronta con la fascia `winRate` della specifica;
4. se il livello è troppo facile, prova a stringerlo (uno slot in meno, secchielli più carichi) senza scendere sotto 6 secchielli dallo stage 3; se non basta, allenta la fascia e lo segnala nel log.

I test verificano che la soluzione di **ogni** livello vinca davvero nella simulazione.

### Aggiungere livelli o uno stage
1. Disegna l'immagine in `scripts/stages/stage-NN.ts` (dimensioni consigliate 8×8 → 14×14) con nome-chiave e parametri. Uno stage nuovo è solo un file nuovo, con `stage`, `key` e `color`: nessun elenco da aggiornare.
2. Aggiungi il nome in inglese e italiano in `src/core/i18n.ts` (`level.<nome>`, e `stage.<key>` per uno stage nuovo): senza traduzione la generazione si ferma.
3. `npm run gen:levels`, poi `npm run preview:levels` per rivedere la pixel art.
4. `npm test` e `npm run test:e2e`.

Uno stage segnato `complete` deve avere esattamente 10 livelli, e solo l'ultimo stage può essere incompleto (altrimenti gli id dei livelli dopo cambierebbero). Regole complete in [`docs/strategia-progetto.md`](docs/strategia-progetto.md#come-si-aggiunge-uno-stage-74). Un'immagine monocolore senza "cornici" di un altro colore viene facile per costruzione: lo sfondo di un altro colore è ciò che crea le corsie bloccate.

### Aggiungere una lingua
Un nuovo dizionario in `src/core/i18n.ts` con le stesse chiavi dell'inglese: `tests/i18n.test.ts` fallisce se ne manca una.

### Ticket e flusso di lavoro
GitHub Issues con milestone (`MVP`, `v0.2`, `v0.3`, `Store release`) ed epic con sub-issue. Ogni ticket di implementazione ha unit test sulla logica e, se tocca l'interfaccia, un test e2e con screenshot in `docs/test-evidence/` e un commento `## Test info` sul ticket. Le regole per chi lavora sul repo (anche con Claude Code) sono in [`CLAUDE.md`](CLAUDE.md).

---

## Verso gli store
- **Google Play**: account sviluppatore 25 $ una tantum, AAB firmato, scheda store, privacy policy, test chiuso (#11).
- **App Store**: Apple Developer 99 $/anno, build su macOS o in cloud (#12).
- Monetizzazione (rewarded ad per "+1 slot", IAP rimuovi pubblicità), analytics, galleria condivisibile, livello del giorno: milestone **Store release**.

Dettagli e costi in [`docs/strategia-progetto.md`](docs/strategia-progetto.md).
