# Playtest harness (#68)

Lets 4–5 agents play the real game in parallel, each in its own browser profile, and writes one form per session in
the format of #67 (`docs/playtest/scheda.schema.json`, protocol in `docs/playtest/protocollo-agent.md`).

- The agent **looks at screenshots and taps**, like a player. `window.__mix` is read only by the harness, to aim
  `column`/`slot` taps and to record telemetry: no part of it reaches the agent.
- Each agent starts from a known save: levels 1…N−1 completed, N open, the tips a player meets before N
  (`saves.ts`). The second pack of a plan starts from its own save.
- The harness writes the telemetry; the agent sends feedback and bugs; at the end the form is checked against the
  schema (hand-written validator, `jsonSchema.ts`) and written as `<out>/Tnn-Ann.json`, screenshots in `<out>/Tnn-Ann/`.

## Running a turn (cloud container or locally)

From the repo root, host shell:

```sh
npm ci
npm run playtest -- --config scripts/playtest/turn.example.json
```

- Builds the game into `dist-playtest/` and serves it on port 4180 (`--game http://…` to use a server already
  running), then opens one Chromium profile per agent: `/opt/pw-browsers/chromium` when it exists (cloud container,
  no `playwright install`), otherwise Playwright's own; `PLAYTEST_CHROMIUM` overrides.
- Control API on `http://127.0.0.1:9300/<agentId>/<action>` (`--port`). Output in `playtest-runs/Tnn-<time>/` (`--out`).
- The turn ends when every agent has ended its session; Ctrl-C stops it early (each session keeps its
  `Tnn-Ann.draft.json`, written after every action with `endReason: errore-harness`).

The config lists the agents of a turn, with the profile's language, viewport and attempt limit (protocol §4) and the
packs (§8): `U1-ONB` (1–10), `U1-FINE` (95–100), `Snn` (the levels of stage nn), `R<from>-<to>` (a range, to finish a pack a session left halfway without replaying the levels already seen). `variant` is `normale` or
`senza-copertura` (universe 3 A/B), `tag` the build tag.

## Token cost (read before planning a turn)

Playtest turns are the most expensive work in this project: on #69 and #156 the agents cost ~$120 at list price, because
every request re-reads the agent's whole context and each screenshot read stays in it for the rest of the session.

- **Ask the tools first.** Questions about the curve (is 184 a spike? is boss 200 a wall?) start from the solver and
  the random-play win rate (`npm run gen:levels`, `aggregate-cli.ts`). Agents answer what needs a player: whether a
  rule is understood, a tip is read, a panel feels unfair, a bug shows up.
- **Only the agents the coverage needs.** Plan the turn from the coverage still missing (protocol §8), 2–3 agents
  when that is enough; 4 is the ceiling, not the default.
- **One pack per agent session.** A subagent plays one pack (~10 levels) and ends; the second pack goes to a fresh
  subagent with its own save. Two packs in one session roughly double the cost of the second.
- **Brief the agent to read screenshots sparingly:** after `idle` or when a panel is up, not after every tap; use
  `taps?seq=` for a planned sequence and look once at the end.
- **Subagents on sonnet**, the turn's orchestration in the main session; a turn never runs in an opus child session
  of its own just to dispatch agents.

## What an agent can do

Every action answers JSON with `screenshot` (absolute path of a PNG: read it to see the screen) and sometimes
`notes` (what the harness did on its own). Screenshots and waits are not actions; the rest count towards the budget
of 80 actions per attempt and 1,500 per session.

| Request | Action |
|---|---|
| `GET /A01/screenshot` | look at the screen |
| `GET /A01/tap?x=180&y=420` | tap a point of the screenshot (CSS pixels) |
| `GET /A01/column?n=2` · `GET /A01/slot?n=1` | tap the n-th visible column (one that still holds a bucket) / waiting slot (1 = leftmost) |
| `GET /A01/taps?seq=c1,c2,s1,180:420` | quick taps, ~150 ms apart (each is one action) |
| `GET /A01/menu` · `GET /A01/restart` | the ◀ and ⟲ buttons of a level |
| `GET /A01/swipe?dy=-300` | drag the map |
| `GET /A01/wait?ms=2000` · `GET /A01/idle` | watch; `idle` waits until the belt is still or a panel is up |
| `GET /A01/skip` | give up the level at the profile's limit: the next planned level opens |
| `POST /A01/feedback?level=101` | the level's feedback, JSON as `$defs.levelFeedback` (after every level) |
| `POST /A01/session-feedback` | JSON as `$defs.sessionFeedback` |
| `POST /A01/bug` | JSON as `$defs.bug` without `id` (the harness numbers it) |
| `GET /A01/missing` | levels still without feedback |
| `GET /A01/end?reason=soglia-abbandono` | end the session (`piano-finito` by default); refused while the form is invalid, `force=1` writes `Tnn-Ann.invalid.json`, left out of the report |

The harness acts on its own, and says so in `notes`, when: a level reaches the profile's attempt limit without a
win (it is `saltato` and the next planned level opens), the plan jumps to its second pack (new save), an attempt
uses 80 actions (closed as `budget`, level restarted), or the session reaches 1,500 actions.

## Tests

- `tests/playtest.test.ts`: the pure part (telemetry, saves and plans, turn config, schema validator); the checks
  against the schema of #67 run once `docs/playtest/` is in the repo.
- `e2e/playtest-harness.spec.ts`: smoke test, the harness plays level 1 to a win and writes a valid form.

## Aggregating the forms (#69)

`npx tsx scripts/playtest/aggregate-cli.ts --out <file.json> <dir>...` reads every valid `Tnn-Ann.json` (and the
`Tnn-Ann.parteN.json` of a session split by an interruption), adds the random-play win rate of each level and writes
per level, per session and the bug list (`aggregate.ts`, protocol §9).
