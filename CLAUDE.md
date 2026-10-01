# Mix & Splash — istruzioni di progetto

## Bootstrap del repo skills (prima di qualsiasi lavoro)
Le skill e le regole globali vivono nel repo privato `alessiogarifo92/claude-skills`, caricato da `~/.claude/` in locale. In una **sessione remota** (Claude Code on the web, container cloud, GitHub Action) `~/.claude/` non esiste: prima di iniziare il lavoro, collega il repo — `add_repo` (owner `alessiogarifo92`, repo `claude-skills`), clone, poi `register_repo_root` — e leggi il suo `CLAUDE.md`. Se il collegamento fallisce, dillo esplicitamente in testo visibile prima di proseguire, invece di lavorare senza regole.

## Progetto
- Strategia, regole di gioco, stack/costi, architettura, percorso store: `docs/strategia-progetto.md`
- Design (direzione "Gouache Studio") e token: `docs/design/README.md` — in codice solo via `src/game/theme.ts`
- Ticket: GitHub issues, milestone `MVP` (epic #1) e `Store release`

## Comandi (dalla root del repo, shell host)
- `npm ci` · `npm run dev` (http://localhost:5173) · `npm test` · `npm run test:coverage` · `npm run lint` · `npm run typecheck` · `npm run build`
- `npm run gen:levels` rigenera `src/levels/levels.json`: ogni livello è accettato solo se il solver lo dimostra risolvibile e cade nella fascia di difficoltà della sua spec (`scripts/level-specs.ts`)
- `npm run test:e2e` (Playwright, Chromium preinstallato in `/opt/pw-browsers`)

## Regole
- `src/core` resta puro (niente Phaser/DOM): è lì che vivono le regole, ed è coperto da unit test con soglie di coverage in `vitest.config.ts`.
- Nessun asset di terzi (grafica disegnata via codice, suoni sintetizzati): ogni asset nuovo passa da un verdetto `market-analyst` su licenza e costo.
