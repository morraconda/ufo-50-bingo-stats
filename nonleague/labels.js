import { isAll } from "../lib/util.js";
import { describeWindow } from "./period.js";

const MAX_LABEL_LENGTH = 15;

export function filterSummary({ mode, player, game }, window) {
  const driving = mode === "player" ? `Player: ${player}` : `Period: ${describeWindow(window)}`;
  return `${driving} | Game: ${game}`;
}

export function sampleSizeText(stats, { mode, player, game }, window) {
  const span = describeWindow(window);

  if (stats.total === 0) {
    return mode === "player"
      ? "No matching goals found for this player/game/period combination."
      : "No matching goals found for this game/period combination.";
  }

  if (mode === "player") {
    return isAll(game)
      ? `Based on ${stats.total} goals where ${player} played, ${span}.`
      : `Based on ${stats.total} ${game} goals where ${player} played, ${span}.`;
  }

  return isAll(game)
    ? `Based on ${stats.total} goals across all games, ${span}.`
    : `Based on ${stats.total} ${game} goals, ${span}.`;
}

export function averagePanelText({ mode, game }, window, averageMode, goalCount) {
  const span = describeWindow(window);

  if (averageMode === "game") {
    return {
      title: "Game average",
      sample: `Based on ${goalCount} goals across all games, ${span}.`,
    };
  }

  return {
    title: mode === "player" ? "Period average (benchmark)" : "Everyone's average (benchmark)",
    sample: isAll(game)
      ? `Based on ${goalCount} goals from everyone, ${span}.`
      : `Based on ${goalCount} ${game} goals from everyone, ${span}.`,
  };
}

export function showAllSummary({ mode, player, game }, window, filterType) {
  const scope = isAll(game) ? "across all games" : `in ${game}`;
  const span = describeWindow(window);

  if (filterType === "player") {
    return `Showing all players ${scope}, ${span}`;
  }

  if (filterType === "period") {
    return mode === "player"
      ? `Showing every period for ${player} ${scope}`
      : `Showing every period ${scope}`;
  }

  return mode === "player"
    ? `Showing all games for ${player}, ${span}`
    : `Showing all games, ${span}`;
}

// Clipped so every bar's label column stays the same width
export function truncateLabel(name) {
  return name.length > MAX_LABEL_LENGTH ? name.substring(0, MAX_LABEL_LENGTH) : name;
}
