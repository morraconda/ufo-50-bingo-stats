import { playableGames } from "../lib/games.js";
import { isAll, normalize } from "../lib/util.js";
import { withinWindow } from "./period.js";

// A non-league selection is { mode: "player" | "period", player, game } plus the period
// window. Unlike a league tier, the window is a time filter that always applies — asking
// about one player still means "within these dates".

export function matchesGame(row, game) {
  return isAll(game) || row.game === game;
}

export function playedIn(row, player) {
  return row.participants.some((name) => normalize(name) === normalize(player));
}

export function selectRows(rows, selection, window) {
  return rows.filter(
    (row) =>
      withinWindow(row.date, window) &&
      matchesGame(row, selection.game) &&
      (selection.mode !== "player" || playedIn(row, selection.player)),
  );
}

export function showAllValues(rows, filterType) {
  if (filterType === "player") {
    const players = new Set();
    for (const row of rows) {
      for (const name of row.participants) players.add(name);
    }
    return [...players].sort((a, b) => a.localeCompare(b));
  }

  const games = new Set(["All", ...playableGames()]);
  for (const row of rows) {
    if (row.game) games.add(row.game);
  }
  return [...games].sort((a, b) => (a === "All" ? -1 : b === "All" ? 1 : a.localeCompare(b)));
}

export function selectorOptions(rows) {
  const players = new Set();
  const games = new Set();

  for (const row of rows) {
    for (const name of row.participants) players.add(name);
    if (row.game) games.add(row.game);
  }

  return { players: [...players], games: [...games] };
}

export function dataDateRange(rows) {
  let first = Infinity;
  let last = -Infinity;

  for (const row of rows) {
    if (row.date < first) first = row.date;
    if (row.date > last) last = row.date;
  }

  return { first, last };
}

// "Defaults to first goal ticked" — the earliest date anyone actually completed something
export function firstCompletedDate(rows) {
  let earliest = Infinity;
  for (const row of rows) {
    if (row.completedBy && row.date < earliest) earliest = row.date;
  }
  return Number.isFinite(earliest) ? earliest : null;
}
