import { playableGames } from "../lib/games.js";
import { isAll, normalize } from "../lib/util.js";

// A selection is what the three dropdowns currently say, plus which one is driving:
//   { mode: "player" | "tier", player, tier, game }

export function matchesGame(row, game) {
  return isAll(game) || row.game === game;
}

export function matchesTier(row, tier) {
  return isAll(tier) || normalize(row.tier) === normalize(tier);
}

export function matchesPlayer(row, player) {
  return (
    normalize(row.player1) === normalize(player) ||
    normalize(row.player2) === normalize(player)
  );
}

export function selectRows(rows, selection) {
  return rows.filter(
    (row) =>
      matchesGame(row, selection.game) &&
      (selection.mode === "player"
        ? matchesPlayer(row, selection.player)
        : matchesTier(row, selection.tier)),
  );
}

// Each bar in a "Show All" list is the current selection with one axis pinned to that
// bar's own value — enumerating players or tiers also pins the mode to that axis.
export function barSelection(selection, filterType, value) {
  if (filterType === "game") return { ...selection, game: value };
  if (filterType === "player") return { ...selection, mode: "player", player: value };
  return { ...selection, mode: "tier", tier: value };
}

// The values a "Show All" list enumerates. Games include every game in UFO 50, not just
// the ones drawn this season, so a game with no goals still shows up as "No data".
export function showAllValues(rows, filterType) {
  const values = new Set();

  if (filterType === "player") {
    for (const row of rows) {
      if (row.player1) values.add(row.player1.trim());
      if (row.player2) values.add(row.player2.trim());
    }
    return [...values];
  }

  values.add("All");

  if (filterType === "tier") {
    for (const row of rows) {
      if (row.tier) values.add(row.tier.trim());
    }
    return [...values];
  }

  for (const game of playableGames()) values.add(game);
  for (const row of rows) {
    if (row.game) values.add(row.game.trim());
  }
  return [...values];
}

// Dropdown options, unlike the "Show All" lists, only offer what the season actually has.
export function selectorOptions(rows) {
  const players = new Set();
  const tiers = new Set();
  const games = new Set();

  for (const row of rows) {
    if (row.player1) players.add(row.player1.trim());
    if (row.player2) players.add(row.player2.trim());
    if (row.tier) tiers.add(row.tier.trim());
    if (row.game) games.add(row.game.trim());
  }

  return { players: [...players], tiers: [...tiers], games: [...games] };
}

export function mostCommonTierForPlayer(rows, player) {
  const tierCounts = new Map();

  for (const row of rows) {
    if (!row.tier || !matchesPlayer(row, player)) continue;
    const tier = row.tier.trim();
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
  }

  let bestTier = "";
  let bestCount = -1;
  for (const [tier, count] of tierCounts) {
    if (count > bestCount) {
      bestTier = tier;
      bestCount = count;
    }
  }
  return bestTier;
}
