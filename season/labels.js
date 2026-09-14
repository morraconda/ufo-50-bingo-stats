import { isAll } from "../lib/util.js";

const MAX_LABEL_LENGTH = 15;

export function filterSummary({ mode, player, tier, game }) {
  const driving = mode === "player" ? `Player: ${player}` : `Tier: ${tier}`;
  return `${driving} | Game: ${game}`;
}

export function sampleSizeText(stats, { mode, player, tier, game }) {
  if (stats.total === 0) {
    return mode === "player"
      ? "No matching goals found for this player/game combination."
      : "No matching goals found for this tier/game combination.";
  }

  if (mode === "player") {
    return isAll(game)
      ? `Based on ${stats.total} goals where ${player} played across all games.`
      : `Based on ${stats.total} goals where ${player} played ${game}.`;
  }

  if (isAll(tier)) {
    return isAll(game)
      ? `Based on ${stats.total} goals across all tiers and all games.`
      : `Based on ${stats.total} ${game} goals across all tiers.`;
  }

  return isAll(game)
    ? `Based on ${stats.total} goals from tier ${tier} across all games.`
    : `Based on ${stats.total} ${game} goals from tier ${tier}.`;
}

export function averagePanelText({ mode, tier, game }, averageMode, goalCount) {
  if (averageMode === "game") {
    return {
      title: "Game average",
      sample: isAll(tier)
        ? `Based on ${goalCount} goals across all games.`
        : `Based on ${goalCount} goals in all tiers.`,
    };
  }

  return {
    title: mode === "player" ? "Tier average (benchmark)" : "Global average (benchmark)",
    sample: isAll(game)
      ? `Based on ${goalCount} goals across all tiers and all games.`
      : `Based on ${goalCount} ${game} goals across all tiers.`,
  };
}

export function showAllSummary({ mode, player, tier, game }, filterType) {
  const scope = isAll(game) ? "across all games" : `in ${game}`;

  if (filterType === "player") {
    return mode === "tier"
      ? `Showing all players in tier ${tier} ${scope}`
      : `Showing all players ${scope}`;
  }

  if (filterType === "tier") {
    return mode === "player"
      ? `Showing all tiers for ${player} ${scope}`
      : `Showing all tiers ${scope}`;
  }

  return mode === "player"
    ? `Showing all games for ${player}`
    : `Showing all games in tier ${tier}`;
}

export function barDisplayName(filterType, value) {
  return filterType === "tier" ? `Tier ${value}` : value;
}

// Clipped so every bar's label column stays the same width
export function truncateLabel(name) {
  return name.length > MAX_LABEL_LENGTH ? name.substring(0, MAX_LABEL_LENGTH) : name;
}
