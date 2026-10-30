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
packs (§8): `U1-ONB` (1–10), `U1-FINE` (95–100), `Snn` (the levels of stage nn). `variant` is `normale` or
`senza-copertura` (universe 3 A/B), `tag` the build tag.

## What an agent can do

Every action answers JSON with `screenshot` (absolute path of a PNG: read it to see the screen) and sometimes
`notes` (what the harness did on its own). Screenshots and waits are not actions; the rest count towards the budget
of 80 actions per attempt and 1,500 per session.

| Request | Action |
|---|---|
| `GET /A01/screenshot` | look at the screen |
| `GET /A01/tap?x=180&y=420` | tap a point of the screenshot (CSS pixels) |
| `GET /A01/column?n=2` · `GET /A01/slot?n=1` | tap the n-th visible column / waiting slot (1 = leftmost) |
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
