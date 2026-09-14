# UFO Bingo Stats Dashboard

**[Open the dashboard](https://morraconda.github.io/ufo-50-bingo-stats/)**

Stats for the UFO 50 Bingo league and non-league play: how often a player, tier, or game gets completed, by whom, and how that compares to everyone else.

## What it shows

Pick a **Player** or a **Tier** (click the empty button next to either to switch which one drives the view), then narrow by **Game**. The bar shows, out of every goal matching that filter:

- completed by the selected player (green)
- completed by their opponent instead (red)
- never completed (black)

Below that, a benchmark bar shows the average for comparison — across all tiers, or across all games, depending on what you pick from the dropdown.

Click **Show All** next to Player, Tier, or Game to break the same stats out into one bar per player/tier/game instead of just the one you've selected. From there you can sort by name, completion %, or goal count, and check **Completion% only** to see just the completed share as one solid bar (handy for ranking games or players by how often they get finished at all).

## Seasons

Tabs at the top switch between datasets:

- **Season 4, 3, 2, 1** — league play, one tab per season. Tiers and player pools differ by season.
- **Non-League** — casual/showcase play, which has no tiers. Instead there's a date range: pick a start date and a period length (1/3/6 months, 1 year, or "to present"). Since non-league matches don't record who was playing, a card counts as a player's if they completed at least one goal on it.
- **Season 3 (legacy)** — the original Season 3 page, kept as-is. It's the only one with a Goal Type (difficulty) filter.

There's also a [scatter plot](https://morraconda.github.io/ufo-50-bingo-stats/graph/) of every Season 3 game, plotting completion % against average goal order.

## Data

All of it is pulled live from the league's Google Sheets, so the numbers update as new matches get logged — no need to reload anything on this end.
