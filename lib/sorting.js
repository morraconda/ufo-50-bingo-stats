import { completedPercent } from "./stats.js";
import { normalize } from "./util.js";

// "General" is the catch-all square rather than a game, so it leads the list instead of
// sitting under G.
export function sortGameOptions(games) {
  const sorted = [...games].sort((a, b) => a.localeCompare(b));
  const generalIndex = sorted.findIndex((game) => normalize(game) === "general");
  if (generalIndex > -1) sorted.unshift(...sorted.splice(generalIndex, 1));
  return sorted;
}

function compareBars(a, b, sortBy, completionOnly) {
  switch (sortBy) {
    case "name":
      // Time-based bars carry an explicit chronological key; the rest sort by label
      if (a.sortValue !== undefined && b.sortValue !== undefined) return a.sortValue - b.sortValue;
      return a.displayName.localeCompare(b.displayName);
    case "completed":
      // The completion-only view draws both completed shares as one block, so rank by that
      return completionOnly
        ? completedPercent(a.stats) - completedPercent(b.stats)
        : a.stats.pctSelected - b.stats.pctSelected;
    case "uncompleted":
      // Reversed, so "Asc" still means worst-completion-first and switching between the
      // Completed % and Uncompleted % columns doesn't flip the whole list
      return b.stats.pctNone - a.stats.pctNone;
    case "byOpponent":
      return a.stats.pctOther - b.stats.pctOther;
    case "goalCount":
      return a.stats.total - b.stats.total;
    default:
      return 0;
  }
}

export function sortBars(bars, { sortBy, order, completionOnly }) {
  const direction = order === "Desc" ? -1 : 1;
  return [...bars].sort((a, b) => direction * compareBars(a, b, sortBy, completionOnly));
}
