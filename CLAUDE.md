# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Running locally

Static site — no build step, no `package.json`, no test runner, no linter. Serve the folder over HTTP:

```bash
npx serve .          # then open the printed URL, usually http://localhost:3000
```

On this machine PowerShell's execution policy blocks the `.ps1` wrappers, so use `npx.cmd serve .` / `npm.cmd` instead.

A web server is required: the season and non-league pages load ES modules, which browsers fetch under CORS, so opening the `.html` files via `file://` fails. (`season3-legacy.html` and `graph/` use classic scripts and would work from `file://`, except the legacy page also fetches `goal types.csv` locally.)

Deploy is a push to `main` — GitHub Pages serves the repo root, with `index.html` as the landing page.

## Data

Every page pulls a published Google Sheet's CSV export at request time (`.../export?format=csv&gid=0`). These sheets are publicly shared and served with permissive CORS, so no API key is involved — the key in `sheets-api.js` is vestigial and unused. There is no local data file; the old `UFO 50 Bingo S3 stats - Data.csv` was deleted and its contents now live in the Season 3 sheet.

Season pages declare their sheet inline via `window.SEASON_CONFIG` in the HTML head. The non-league sheet id is hardcoded in `nonleague/sheet.js`; the scatter plot's is in `graph/graph.js`.

League sheets share one column layout (`Week, Tier, #, Player 1, Player 2, Date, Completed by, Game, Goal, ...`). The non-league sheet does not: it has `Name, Date, Completed by, Game, ...` with no player pair and no tier.

## Page map

| Page | App | Notes |
|---|---|---|
| `index.html` | `season-app.js` | Season 4 — the default landing page |
| `season3/2/1.html` | `season-app.js` | Same app, different sheet |
| `nonleague.html` | `nonleague-app.js` | Date-period axis instead of tier |
| `season3-legacy.html` | `app.js` + `sheets-api.js` | Frozen original; the only page with the goal-type (difficulty) selector |
| `graph/index.html` | `graph/graph.js` | Standalone Season 3 scatter plot |

`app.js` and `sheets-api.js` are the pre-refactor globals-on-`window` lineage, kept only for the legacy page. Don't extend them — but they are useful as a behavioural reference (see Verifying changes).

## Architecture

Three module directories, all plain ES modules with no bundler:

- `lib/` — shared by every dashboard: `csv`, `util`, `games`, `stats`, `bars`, `sorting`, `dom`
- `season/` — league-specific: `sheets`, `filters`, `labels`, `sorting` (tier ordering)
- `nonleague/` — `sheet`, `period`, `filters`, `labels`

`lib/dom.js` holds only the furniture both page types share; each app builds its own `controls` map, because the middle filter row differs (tier vs. date period).

**The selection model is the central idea.** A selection is `{ mode, player, tier, game }` (league) or `{ mode, player, game }` plus a time window (non-league). `selectRows(rows, selection)` is the single predicate for "which rows count", and each bar in a "Show All" list is that same selection with one axis pinned to the bar's own value (`barSelection`). Reach for that before writing a new bespoke filter — the pre-refactor code had this logic copy-pasted five times with subtle drift.

Bar statistics come from `computeOutcomeStats(rows, mode, selectedPlayer)`, which splits goals into completed-by-you / completed-by-someone-else / uncompleted. With no player selected there is no "you", so each completed goal is credited to the average participant of its match — `1 / row.participants.length`, defaulting to 2. League rows have no `participants`, so they get the ÷2 that 1v1 implies.

## Things that will bite you

- **Game names must match the sheet exactly.** `lib/games.js` maps names to disk artwork numbers, and an unmatched name silently falls back to Barbuta's disk rather than erroring. The sheets say `Mortol II` and `Mini & Max` (not "Mortol 2" / "Mini and Max"); getting this wrong has already caused one bug.
- **Tier names differ per season** — S1 is A/B/C, S2–S3 are A/B1/B2/C1/C2, S4 is A1/A2/B1/B2/C1/C2. `season/sorting.js` sorts them naturally rather than from a fixed list, so a new scheme needs no code change.
- **Non-league cards don't record who played.** Participants are derived as everyone who ticked at least one goal on that card, so a player who scored nothing on a card is invisible on it. 147 of ~1330 cards are not 1v1 (team games, showcases).
- **Sort direction is deliberate.** In the "All Bars" list, "Asc" means worst-completion-first for *both* the Completed % and Uncompleted % columns — `sortBars` reverses the uncompleted comparison on purpose, so switching columns doesn't flip the list. Bars carrying a `sortValue` (the non-league period bars) sort by it chronologically instead of by label.
- **`graph/graph.js` nudges overlapping disks apart.** Two games landing at near-identical coordinates used to hide one another completely.

## Verifying changes

There is no test suite. The reliable way to check a behaviour change is a jsdom snapshot diff: render a page, drive the controls, and compare the rendered bars against the `season3-legacy.html` page, which is untouched original logic and should agree with `season3.html` everywhere except its extra goal-type clauses ("| Type: All", "and all goal types").

jsdom cannot execute `<script type="module">`, so for the modular pages set `global.document` / `global.window` / `global.Option` / `global.fetch` from a JSDOM instance and then dynamic-`import()` the entry module. Module state is cached per process, so run one page per node process rather than looping in one.

## Note

`README.md` is out of date — it describes the pre-Google-Sheets single-page version and a local CSV that no longer exists. `test.py`, `update_filter.js`, `test-sheets.html` and `debug/` are one-off scratch files, not part of the app.
