# Mix & Splash — strategia di progetto

> Fonte: report Notion *"Idee per giochi casual semplici e virali (stile Flappy Bird) — Report 2026"* + ricerca aggiuntiva (1 ott 2026).
> Nome di lavoro: **Mix & Splash** (da verificare marchio/omonimie prima dello store — esiste già "Mix & Paint" su Google Play).

## 1. Idea (fase 1 — confermata dall'utente)

**Pitch in una frase:** dipingi un'immagine a pixel mandando secchielli di vernice su un nastro che gira attorno alla tela — ma hai **solo rosso, giallo e blu**: arancione, verde e viola li ottieni **mescolando sulla tela**.

Perché questa e non un clone:
- Resta nel sottogenere più caldo del 2025-26 (conveyor/color shooter: Pixel Flow ~200M $ primo anno, trend "conveyor" il più cresciuto nell'ultimo anno).
- La regola nuova (mixing sottrattivo sul bersaglio) non esiste nei concorrenti: i color-mixing game esistenti (Mix & Paint, Mazeiro, Color Merge) sono puzzle statici; i conveyor shooter (Pixel Flow e cloni) hanno colore = bersaglio 1:1. L'unico "spari colori primari e li mescoli" è ChromaGun (FPS PC, 2017).
- Rispetta i principi del report: one-tap, regole in una frase, deterministico, leggibile in un video di 3 s (splash di colore), difficoltà a gradini, niente livelli truccati.

### Regole (game design MVP)
- **Tela**: griglia W×H; ogni cella è vuota o ha un colore bersaglio: R, Y, B (primari) o O=R+Y, G=Y+B, P=R+B (secondari). Internamente è una bitmask (R=1, Y=2, B=4).
- **Pixel**: parte bianco; ogni colpo aggiunge un primario. È *completo* quando i primari ricevuti = bersaglio. Un secondario richiede **due colpi di colori diversi**, in qualsiasi ordine.
- **Nastro**: percorre il perimetro della tela (sotto → destra → sopra → sinistra). Ogni secchiello ha un colore primario e un numero di colpi. A ogni corsia (colonna o riga) guarda verso l'interno: la vernice **vola sopra i pixel completi** e colpisce il **primo pixel non completo**. Se quel pixel accetta il suo colore (lo contiene e non l'ha già) → colpo (-1 munizione). Altrimenti la corsia è **bloccata** e il secchiello non spara.
- **Strategia**: un pixel viola in prima fila blocca tutta la sua corsia finché non arrivano *sia* rosso *sia* blu. Bisogna scegliere l'ordine dei secchielli.
- **Coda**: 2–4 colonne di secchielli in basso; tocchi una colonna → il primo secchiello entra sul nastro (capienza nastro limitata).
- **Giro completo**: se il secchiello ha ancora colpi va in uno **slot d'attesa** (3–5 slot); da lì lo puoi rilanciare. Se esaurisce i colpi sparisce.
- **Vittoria**: tutti i pixel completi. **Sconfitta**: un secchiello deve tornare ma gli slot sono pieni (*ingorgo*).
- **Anti-frustrazione** (lezione negativa di Pixel Flow): all'ingorgo il nastro si ferma e propone *+1 slot* (gratis 1 volta/livello nell'MVP; in futuro rewarded ad) o *riprova*. Le munizioni totali per colore sono esattamente quelle necessarie e **ogni livello rilasciato è verificato risolvibile da un solver** nei test.

### Difficoltà a gradini (un elemento nuovo ogni pochi livelli)
| Livelli | Novità |
|---|---|
| 1–3 | Solo primari, 2 colonne, tela 8×8 |
| 4–6 | Primo secondario (arancione), poi verde |
| 7–9 | Viola + tutti i secondari, 3 colonne |
| 10–12 | Tele 10×10, munizioni più piccole, meno slot |
| 13–15 | Tele 12×12, 4 colonne, nastro con capienza ridotta |
| post-MVP | Pixel speciali: ghiaccio (2 colpi), "fango" da lavare, pixel nascosti, boss level |

### Primo accesso e lingue (v0.2)
- **Tutorial interattivo, non testo**: il livello 1 è guidato (colonna evidenziata, mano animata, una riga di testo; i tap fuori dal bersaglio sono ignorati finché il primo secchiello non parte). Poi suggerimenti una tantum quando compare una meccanica nuova: mixing, corsia bloccata, slot d'attesa. "Come si gioca" (3 schede) resta consultabile dalle Impostazioni, con "Rivedi il tutorial". Motivo: negli hybrid-casual si impara giocando, i muri di testo vengono saltati (ticket #20).
- **Lingue**: inglese di default, italiano disponibile; scelta nelle Impostazioni, salvata nei progressi. Aggiungere una lingua = un dizionario in `src/core/i18n.ts`; un test verifica che abbia tutte le chiavi dell'inglese (ticket #19).

### 100 livelli in 10 stage tematici (v0.3, epic #22)
- 10 stage da 10 livelli, ognuno con un tema (Atelier, Frutta, Animali, Giardino, Mare, Città, Cibo, Veicoli, Spazio, Fantasia); il 10° di ogni stage è il boss.
- Le meccaniche nuove arrivano ogni ~2 stage, indipendenti dal tema: **ghiaccio** (stage 4: pixel primario da colpire due volte con il suo colore) e **pixel nascosti** (stage 6: "?" che blocca la corsia finché un vicino non è completo).
- Formato livello: `overlay` opzionale sopra l'immagine (`i` ghiaccio, `h` nascosto). Le regole di colpo stanno in `src/core/rules.ts`, condivise da simulazione e solver.
- I 10 quadri di uno stage formano una pagina d'album (#40).

### Meta leggero
- MVP: mappa livelli con sblocco progressivo, salvataggio locale, schermate vittoria/sconfitta.
- Post-MVP: skin dei secchielli, collezione "galleria" dei quadri completati (si condividono come immagine → viralità), streak giornaliera, livello del giorno.

## 2. Strumenti e costi (fase 2)

| Componente | Scelta | Licenza | Costo oggi | Costo a 10× | Note |
|---|---|---|---|---|---|
| Motore 2D | **Phaser 3** | MIT | 0 € | 0 € | Maturo, WebGL/Canvas, ottimo su mobile web |
| Linguaggio/build | TypeScript + **Vite** | Apache-2.0 / MIT | 0 € | 0 € | |
| Test | **Vitest** (unit) + **Playwright** (e2e) | MIT / Apache-2.0 | 0 € | 0 € | Chromium già presente nell'ambiente |
| PWA | vite-plugin-pwa | MIT | 0 € | 0 € | Gioco installabile da link |
| App native | **Capacitor** (Android ora, iOS poi) | MIT | 0 € | 0 € | Stesso codice web dentro WebView |
| Build APK | **GitHub Actions** (runner Ubuntu con Android SDK) | — | 0 € (repo privato: 2.000 min/mese gratis) | 0 € (~5 min/build) | Artefatto APK scaricabile a ogni push |
| Hosting demo web | GitHub Pages / Cloudflare Pages | — | 0 € | 0 € | Pages su repo privato richiede piano Pro → alternativa Cloudflare Pages gratis |
| Grafica | Disegnata via codice (Phaser Graphics) | — | 0 € | 0 € | Nessun asset di terzi → zero rischi copyright |
| Suoni | Sintetizzati con Web Audio API | — | 0 € | 0 € | Nessun file audio di terzi |
| Font | Sistema (MVP); eventuale Fredoka via @fontsource | OFL-1.1 | 0 € | 0 € | OFL consente uso commerciale e bundling |
| Google Play | Account sviluppatore | — | **25 $ una tantum** | idem | Account personali nuovi: test chiuso con 12 tester per 14 giorni prima della produzione |
| Apple App Store | Apple Developer Program | — | **99 $/anno** | idem | Serve macOS/Xcode per firmare: Mac proprio o build cloud (Codemagic free tier 500 min/mese, GitHub macOS runner) |
| Ads (post-MVP) | AdMob via plugin Capacitor community | MIT (plugin) | 0 € (revenue share) | — | Rewarded ad per "+1 slot" |
| Analytics (post-MVP) | Firebase Analytics | gratuito | 0 € | 0 € | Retention D1/D7, abbandono per livello |

**Verdetto:** l'MVP costa 0 €. Primo costo reale = 25 $ per Google Play quando si pubblica. Nessuna dipendenza copyleft.

## 3. Architettura (fase 3)

```
src/
  core/        logica pura, zero dipendenze da Phaser → testabile con Vitest
    colors.ts    bitmask primari, mixing, nomi/HEX via theme
    level.ts     formato livello (JSON), parsing e validazione
    sim.ts       stato di gioco + step() deterministico a tick (nastro, colpi, slot, win/lose)
    solver.ts    DFS con memo: verifica che un livello sia risolvibile
    generator.ts genera le code di secchielli da un'immagine (seeded RNG) + verifica col solver
    progress.ts  salvataggio progressi (storage astratto: localStorage / Capacitor Preferences)
  game/        rendering Phaser: legge lo stato core e lo anima (tween, particelle)
    scenes/      Boot, Menu (mappa livelli), Play, overlay Win/Lose
    theme.ts     token di design (palette, font, spaziature) — unica fonte di stile
    audio.ts     effetti sintetizzati (Web Audio)
  levels/      levels.json generato da scripts/gen-levels.ts (committato, verificato nei test)
android/     progetto Capacitor generato
```

Principi:
- **Simulazione deterministica a tick** (≈90 ms/tick, configurabile) separata dal rendering: il rendering interpola. Stessi input → stesso risultato, quindi replay, test e solver usano lo stesso codice.
- **Nessun backend nell'MVP** (tutto offline). Il backend opzionale del report (classifiche, eventi giornalieri) arriva dopo, solo se i dati di retention lo giustificano.
- Coverage di `src/core` misurata con Vitest (v8) nella CI.

## 4. Design UI/UX (fase 3.5)
Tre direzioni sullo stesso set di schermate (Gioco, Mappa livelli, Vittoria): vedi `docs/design/directions.html`.
**Direzione scelta: A — "Gouache Studio"** (scelta delegata a Claude dall'utente; modificabile, lo stile vive in `src/game/theme.ts`). Token in `docs/design/README.md`.

## 5. Ticket
Milestone **MVP** su GitHub (epic + sub-issue). Milestone **Store release** per monetizzazione, analytics e pubblicazione.

## 6. Percorso verso gli store
1. **APK debug** da GitHub Actions → installabile su qualsiasi Android (attivando "origini sconosciute").
2. **Release firmata (AAB)**: keystore generato una volta e salvato nei *secrets* del repo (mai committato).
3. **Google Play**: account 25 $, scheda store (icona 512, feature graphic 1024×500, screenshot), privacy policy (obbligatoria anche senza dati personali), questionario contenuti (IARC), *closed testing* 12 tester × 14 giorni, poi produzione.
4. **App Store**: `npx cap add ios`, build su macOS (Codemagic o runner macOS), TestFlight, review Apple. Le linee guida richiedono che l'app non sia "solo un sito web": il gioco offline completo lo soddisfa.
5. Con ads/IAP: consenso GDPR (UMP di Google), ATT su iOS, dichiarazioni Data safety / Privacy nutrition label.
