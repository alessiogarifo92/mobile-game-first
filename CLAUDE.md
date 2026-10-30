# Mix & Splash — istruzioni di progetto

## Bootstrap del repo skills (prima di qualsiasi lavoro)
Le skill e le regole globali vivono nel repo privato `alessiogarifo92/claude-skills`, caricato da `~/.claude/` in locale. In una **sessione remota** (Claude Code on the web, container cloud, GitHub Action) `~/.claude/` non esiste: prima di iniziare il lavoro, collega il repo — `add_repo` (owner `alessiogarifo92`, repo `claude-skills`), clone, poi `register_repo_root` — e leggi il suo `CLAUDE.md`. Se il collegamento fallisce, dillo esplicitamente in testo visibile prima di proseguire, invece di lavorare senza regole.

## Progetto
- Strategia, regole di gioco, stack/costi, architettura, percorso store: `docs/strategia-progetto.md`
- Design (direzione "Gouache Studio") e token: `docs/design/README.md` — in codice solo via `src/game/theme.ts`
- Ticket: GitHub issues, milestone `MVP` (epic #1) e `Store release`

## Comandi (dalla root del repo, shell host)
- `npm ci` · `npm run dev` (http://localhost:5173) · `npm test` · `npm run test:coverage` · `npm run lint` · `npm run typecheck` · `npm run build`
- Livelli in stage da 10 (`scripts/stages/stage-NN.ts`). `npm run gen:levels` rigenera solo i livelli cambiati (`--check` in CI); ogni livello è accettato solo se il solver lo dimostra risolvibile e cade nella fascia di difficoltà della sua spec. `npm run preview:levels` disegna la pixel art di ogni stage in `docs/levels/`
- `npm run playtest -- --config scripts/playtest/turn.example.json`: un turno di playtest agent (#68), guida in `scripts/playtest/README.md`
- `npm run test:e2e` (Playwright, Chromium preinstallato in `/opt/pw-browsers`)
  - **Container cloud**: il progetto fissa `@playwright/test` 1.56.1, ma il Chromium preinstallato è di una versione più nuova, quindi `test:e2e` fallisce all'avvio con "Executable doesn't exist … headless_shell". Non lanciare `playwright install`. Crea un config locale, da non committare (aggiungilo a `.git/info/exclude`): `playwright.local.config.ts` con `import base from './playwright.config'; export default { ...base, use: { ...base.use, launchOptions: { executablePath: '/opt/pw-browsers/chromium' } } };`. Poi lancia `npx playwright test -c playwright.local.config.ts`.
  - Con 4 worker il container è carico e alcuni test lunghi vanno in timeout: prima di parlare di regressione, rilancia i test falliti con `--workers=1`.

## Regole
- `src/core` resta puro (niente Phaser/DOM): è lì che vivono le regole, ed è coperto da unit test con soglie di coverage in `vitest.config.ts`.
- Nessun asset di terzi (grafica disegnata via codice, suoni sintetizzati): ogni asset nuovo passa da un verdetto `market-analyst` su licenza e costo.
