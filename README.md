# Mix & Splash

Puzzle casual: dipingi immagini a pixel mandando secchielli di vernice su un nastro che gira attorno alla tela. Hai **solo rosso, giallo e blu**: arancione, verde e viola li ottieni **mescolando sulla tela**.

- Strategia, regole, stack e costi, percorso verso gli store: [`docs/strategia-progetto.md`](docs/strategia-progetto.md)
- Design (direzione "Gouache Studio"): [`docs/design/README.md`](docs/design/README.md)

## Sviluppo
Dalla root del repo, nella shell host (Node 22):

```bash
cd /percorso/di/mobile-game-first
npm ci
npm run dev          # http://localhost:5173 — dal telefono sulla stessa rete: http://<IP-del-PC>:5173
npm test             # unit test (logica in src/core)
npm run test:coverage
npm run test:e2e     # Playwright: tutorial livello 1 → vittoria, mixing, ingorgo, lingua
npm run lint && npm run typecheck
npm run build        # build web + PWA in dist/
```

## Lingue
Inglese di default, italiano disponibile (Impostazioni ⚙ nella mappa). I testi stanno in `src/core/i18n.ts`: per aggiungere una lingua basta un nuovo dizionario con le stesse chiavi dell'inglese (lo verifica `tests/i18n.test.ts`).

## Livelli
I livelli sono organizzati in **stage da 10** (piano completo nell'epic #22). Ogni stage ha il suo file in `scripts/stages/stage-NN.ts`, elencato in `scripts/stages/index.ts`; il 10° livello di ogni stage è il boss.

- `npm run gen:levels`: rigenera `src/levels/levels.json`, ma solo i livelli la cui specifica è cambiata (`--force` per tutti, `--check` per verificare l'allineamento, come fa la CI)
- `npm run preview:levels`: foglio di anteprima della pixel art di ogni stage in `docs/levels/stage-NN.png`

Un livello viene accettato solo se:
1. il **solver** dimostra che è risolvibile entro il suo budget (`nodeBudget`); se il budget finisce, il livello viene scartato;
2. la percentuale di vittorie di un **giocatore casuale** cade nella fascia di difficoltà della spec.

I nomi dei livelli sono chiavi tradotte (`level.<name>` in `src/core/i18n.ts`): un nome senza traduzione blocca la generazione.

## APK Android
Ogni push esegue il workflow **Android APK** (GitHub Actions): build web → `cap sync android` → `gradlew assembleDebug`.
1. GitHub → tab **Actions** → ultima esecuzione di *Android APK* → sezione **Artifacts** → scarica `mix-and-splash-debug-apk` (zip con `app-debug.apk`).
2. Copia l'APK sul telefono e aprilo; Android chiederà di consentire l'installazione da "origini sconosciute" per l'app usata (es. Files o Chrome).

Build locale (serve Android Studio / Android SDK + JDK 21): `npm run android:sync`, poi `cd android && ./gradlew assembleDebug`; l'APK è in `android/app/build/outputs/apk/debug/`.

## Store
Pubblicazione su Google Play (25 $ una tantum) e App Store (99 $/anno): vedi `docs/strategia-progetto.md` §6 e la milestone **Store release** su GitHub.
