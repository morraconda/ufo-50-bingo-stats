import { normalize, percent } from "./util.js";

// A match is 1v1 unless the rows say otherwise
const DEFAULT_PARTICIPANTS = 2;

// Splits goal rows three ways: completed by the selected player, completed by someone
// else in the match, and never completed.
//
// Without a selected player there is no "you" to measure, so each completed goal is
// credited to the average participant of its match — half in a 1v1, a quarter in a
// four-way — which is the share a typical player in that pool took.
export function computeOutcomeStats(rows, mode, selectedPlayer) {
  const total = rows.length;
  let bySelectedPlayer = 0;
  let byOtherPlayer = 0;
  let uncompleted = 0;

  for (const row of rows) {
    const completedBy = normalize(row.completedBy);

    if (!completedBy) {
      uncompleted += 1;
    } else if (mode === "player") {
      if (completedBy === normalize(selectedPlayer)) bySelectedPlayer += 1;
      else byOtherPlayer += 1;
    } else {
      const share = 1 / (row.participants?.length || DEFAULT_PARTICIPANTS);
      bySelectedPlayer += share;
      byOtherPlayer += 1 - share;
    }
  }

  return {
    total,
    bySelectedPlayer,
    byOther: byOtherPlayer,
    uncompleted,
    pctSelected: percent(bySelectedPlayer, total),
    pctOther: percent(byOtherPlayer, total),
    pctNone: percent(uncompleted, total),
  };
}

// Completed by either side — what the completion-only view shows as one block.
export function completedPercent(stats) {
  return stats.pctSelected + stats.pctOther;
}
