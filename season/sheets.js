import { columnFinder, fetchSheetCsv } from "../lib/csv.js";

// Loads one league season's goal rows. The page says which sheet it wants via
// window.SEASON_CONFIG; publicly-shared sheets need no API key, since the CSV export
// endpoint serves them with permissive CORS.
let cachedRows = null;

export async function loadSeasonRows() {
  if (cachedRows) return cachedRows;

  const { spreadsheetId } = window.SEASON_CONFIG || {};
  if (!spreadsheetId) {
    throw new Error("No SEASON_CONFIG.spreadsheetId declared on this page");
  }

  const table = await fetchSheetCsv(spreadsheetId);
  const find = columnFinder(table[0]);
  const index = {
    tier: find("tier"),
    player1: find("player 1"),
    player2: find("player 2"),
    completedBy: find("completed"),
    game: find("game"),
    goal: find("goal"),
  };

  cachedRows = table.slice(1).map((record) => ({
    tier: record[index.tier] || "",
    player1: record[index.player1] || "",
    player2: record[index.player2] || "",
    completedBy: record[index.completedBy] || "",
    game: record[index.game] || "",
    goal: record[index.goal] || "",
  }));

  return cachedRows;
}
