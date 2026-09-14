import { columnFinder, fetchSheetCsv } from "../lib/csv.js";
import { parseSheetDate } from "./period.js";

const SPREADSHEET_ID = "1ltJGLwAM_PE4yVtl5QnFWKhfYQ5lYTS7ITax2EpCTAw";

// Non-league cards are logged differently from league matches: there is one free-text
// match Name instead of a Player 1 / Player 2 pair, and no tier. Nobody records who sat
// down to play, so a card's participants are taken to be everyone who ticked at least one
// goal on it — the only signal the sheet gives. A player who scored nothing on a card is
// therefore invisible on it.
function attachParticipants(rows) {
  const byMatch = new Map();

  for (const row of rows) {
    let participants = byMatch.get(row.match);
    if (!participants) {
      participants = new Set();
      byMatch.set(row.match, participants);
    }
    if (row.completedBy) participants.add(row.completedBy);
  }

  for (const row of rows) {
    row.participants = [...byMatch.get(row.match)];
  }
  return rows;
}

let cachedRows = null;

export async function loadNonLeagueRows() {
  if (cachedRows) return cachedRows;

  const table = await fetchSheetCsv(SPREADSHEET_ID);
  const find = columnFinder(table[0]);
  const index = {
    name: find("name"),
    date: find("date"),
    completedBy: find("completed by"),
    game: find("game"),
    goal: find("goal"),
    matchLink: find("match link"),
  };

  const rows = table.slice(1).map((record) => {
    const name = (record[index.name] || "").trim();
    return {
      // Match links are the reliable identity; the name is free text and gets reused
      match: (record[index.matchLink] || "").trim() || `name:${name}`,
      matchName: name,
      date: parseSheetDate(record[index.date]),
      completedBy: (record[index.completedBy] || "").trim(),
      game: (record[index.game] || "").trim(),
      goal: record[index.goal] || "",
    };
  });

  cachedRows = attachParticipants(rows.filter((row) => row.date !== null));
  return cachedRows;
}
