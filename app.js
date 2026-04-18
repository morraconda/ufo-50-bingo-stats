const CSV_PATH = "./UFO 50 Bingo S3 stats - Data.csv";

const playerControl = document.getElementById("playerControl");
const tierControl = document.getElementById("tierControl");
const playerUsingBadge = document.getElementById("playerUsingBadge");
const tierUsingBadge = document.getElementById("tierUsingBadge");
const playerSelect = document.getElementById("playerSelect");
const tierSelect = document.getElementById("tierSelect");
const gameSelect = document.getElementById("gameSelect");
const activeFilterEl = document.getElementById("activeFilter");
const sampleSizeEl = document.getElementById("sampleSize");
const statusEl = document.getElementById("status");

const barByPlayer = document.getElementById("barByPlayer");
const barByOther = document.getElementById("barByOther");
const barUncompleted = document.getElementById("barUncompleted");
const tierAverageSection = document.getElementById("tierAverageSection");
const tierAverageTitle = document.getElementById("tierAverageTitle");
const tierAverageSample = document.getElementById("tierAverageSample");
const tierAvgBarByPlayer = document.getElementById("tierAvgBarByPlayer");
const tierAvgBarByOther = document.getElementById("tierAvgBarByOther");
const tierAvgBarUncompleted = document.getElementById("tierAvgBarUncompleted");

let rows = [];
let filterMode = "tier";

function parseCsv(text) {
  const lines = [];
  let current = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      current.push(field);
      field = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }
      current.push(field);
      field = "";
      if (current.length > 1 || current[0] !== "") {
        lines.push(current);
      }
      current = [];
      continue;
    }

    field += char;
  }

  if (field.length > 0 || current.length > 0) {
    current.push(field);
    lines.push(current);
  }

  return lines;
}

function normalize(value) {
  return (value || "").trim().toLowerCase();
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function percent(numerator, denominator) {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}

function isAll(value) {
  return normalize(value) === "all";
}

function matchesGame(row, selectedGame) {
  return isAll(selectedGame) || row.game === selectedGame;
}

function computeOutcomeStats(filteredRows, mode, selectedPlayer) {
  const total = filteredRows.length;
  let bySelectedPlayer = 0;
  let byOtherPlayer = 0;
  let uncompleted = 0;

  for (const row of filteredRows) {
    const completedBy = normalize(row.completedBy);
    const selected = normalize(selectedPlayer);

    if (!completedBy) {
      uncompleted += 1;
    } else if (mode === "player" && completedBy === selected) {
      bySelectedPlayer += 1;
    } else if (
      mode === "tier" &&
      completedBy &&
      (completedBy === normalize(row.player1) || completedBy === normalize(row.player2))
    ) {
      bySelectedPlayer += 1;
    } else {
      byOtherPlayer += 1;
    }
  }

  if (mode === "tier") {
    const completed = total - uncompleted;
    bySelectedPlayer = completed / 2;
    byOtherPlayer = completed / 2;
  }

  return {
    total,
    bySelectedPlayer,
    byOtherPlayer,
    uncompleted,
    pctSelected: percent(bySelectedPlayer, total),
    pctOther: percent(byOtherPlayer, total),
    pctNone: percent(uncompleted, total),
  };
}

function renderBar(barElements, stats) {
  const { byPlayerEl, uncompletedEl, byOtherEl } = barElements;
  byPlayerEl.style.width = `${stats.pctSelected}%`;
  uncompletedEl.style.width = `${stats.pctNone}%`;
  byOtherEl.style.width = `${stats.pctOther}%`;

  byPlayerEl.textContent = stats.pctSelected <= 0 ? "" : `${stats.pctSelected.toFixed(1)}%`;
  uncompletedEl.textContent = stats.pctNone <= 0 ? "" : `${stats.pctNone.toFixed(1)}%`;
  byOtherEl.textContent = stats.pctOther <= 0 ? "" : `${stats.pctOther.toFixed(1)}%`;
}

function getMostCommonTierForPlayer(playerName) {
  const tierCounts = new Map();
  for (const row of rows) {
    const inMatch =
      normalize(row.player1) === normalize(playerName) ||
      normalize(row.player2) === normalize(playerName);
    if (!inMatch || !row.tier) continue;
    const tier = row.tier.trim();
    tierCounts.set(tier, (tierCounts.get(tier) || 0) + 1);
  }

  let bestTier = "";
  let bestCount = -1;
  for (const [tier, count] of tierCounts.entries()) {
    if (count > bestCount) {
      bestTier = tier;
      bestCount = count;
    }
  }
  return bestTier;
}

function populateFilters(dataRows) {
  const players = new Set();
  const tiers = new Set();
  const games = new Set();

  for (const row of dataRows) {
    if (row.player1) players.add(row.player1.trim());
    if (row.player2) players.add(row.player2.trim());
    if (row.tier) tiers.add(row.tier.trim());
    if (row.game) games.add(row.game.trim());
  }

  const sortedPlayers = [...players].sort((a, b) => a.localeCompare(b));
  const sortedTiers = [...tiers].sort((a, b) => a.localeCompare(b));
  const sortedGames = [...games].sort((a, b) => a.localeCompare(b));
  const generalIndex = sortedGames.findIndex(
    (game) => normalize(game) === "general",
  );
  if (generalIndex > -1) {
    const [generalGame] = sortedGames.splice(generalIndex, 1);
    sortedGames.unshift(generalGame);
  }

  playerSelect.innerHTML = sortedPlayers
    .map((player) => `<option value="${player}">${player}</option>`)
    .join("");

  gameSelect.innerHTML = sortedGames
    .map((game) => `<option value="${game}">${game}</option>`)
    .join("");
  gameSelect.insertAdjacentHTML("afterbegin", '<option value="All">All</option>');

  tierSelect.innerHTML = sortedTiers
    .map((tier) => `<option value="${tier}">${tier}</option>`)
    .join("");
  tierSelect.insertAdjacentHTML("afterbegin", '<option value="All">All</option>');

  tierSelect.value = "All";
  gameSelect.value = "All";
}

function applyFilterModeUi() {
  const usingPlayer = filterMode === "player";
  playerControl.classList.toggle("active", usingPlayer);
  tierControl.classList.toggle("active", !usingPlayer);
  playerUsingBadge.textContent = usingPlayer ? "Using" : "";
  tierUsingBadge.textContent = usingPlayer ? "" : "Using";

  const currentValue = usingPlayer ? playerSelect.value : tierSelect.value;
  activeFilterEl.textContent = usingPlayer
    ? `Using Player filter (last changed): ${currentValue}`
    : `Using Tier filter (last changed): ${currentValue}`;
}

function updateDashboard() {
  const selectedPlayer = playerSelect.value;
  const selectedTier = tierSelect.value;
  const selectedGame = gameSelect.value;

  const filtered = rows.filter((row) => {
    const sameGame = matchesGame(row, selectedGame);
    if (!sameGame) return false;

    if (filterMode === "player") {
      const playerInMatch =
        normalize(row.player1) === normalize(selectedPlayer) ||
        normalize(row.player2) === normalize(selectedPlayer);
      return playerInMatch;
    }

    if (isAll(selectedTier)) {
      return true;
    }
    return normalize(row.tier) === normalize(selectedTier);
  });

  const stats = computeOutcomeStats(filtered, filterMode, selectedPlayer);
  renderBar(
    {
      byPlayerEl: barByPlayer,
      uncompletedEl: barUncompleted,
      byOtherEl: barByOther,
    },
    stats,
  );

  sampleSizeEl.textContent =
    stats.total === 0
      ? filterMode === "player"
        ? "No matching goals found for this player/game combination."
        : "No matching goals found for this tier/game combination."
      : filterMode === "player"
        ? isAll(selectedGame)
          ? `Based on ${stats.total} goals where ${selectedPlayer} played across all games.`
          : `Based on ${stats.total} goals where ${selectedPlayer} played ${selectedGame}.`
        : isAll(selectedTier)
          ? isAll(selectedGame)
            ? `Based on ${stats.total} goals across all tiers and all games.`
            : `Based on ${stats.total} ${selectedGame} goals across all tiers.`
          : isAll(selectedGame)
            ? `Based on ${stats.total} goals from tier ${selectedTier} across all games.`
            : `Based on ${stats.total} ${selectedGame} goals from tier ${selectedTier}.`;

  if (filterMode === "player") {
    const tierFiltered = rows.filter(
      (row) =>
        matchesGame(row, selectedGame) &&
        (isAll(selectedTier) || normalize(row.tier) === normalize(selectedTier)),
    );
    const tierStats = computeOutcomeStats(tierFiltered, "tier", selectedPlayer);
    renderBar(
      {
        byPlayerEl: tierAvgBarByPlayer,
        uncompletedEl: tierAvgBarUncompleted,
        byOtherEl: tierAvgBarByOther,
      },
      tierStats,
    );

    tierAverageSection.hidden = false;
    tierAverageTitle.textContent = isAll(selectedTier)
      ? "Tier average (All tiers)"
      : `Tier average (${selectedTier})`;
    tierAverageSample.textContent = isAll(selectedTier)
      ? isAll(selectedGame)
        ? `Based on ${tierStats.total} goals across all tiers and all games.`
        : `Based on ${tierStats.total} ${selectedGame} goals across all tiers.`
      : isAll(selectedGame)
        ? `Based on ${tierStats.total} goals in tier ${selectedTier} across all games.`
        : `Based on ${tierStats.total} ${selectedGame} goals in tier ${selectedTier}.`;
  } else {
    const globalFiltered = rows.filter((row) => matchesGame(row, selectedGame));
    const globalStats = computeOutcomeStats(globalFiltered, "tier", selectedPlayer);
    renderBar(
      {
        byPlayerEl: tierAvgBarByPlayer,
        uncompletedEl: tierAvgBarUncompleted,
        byOtherEl: tierAvgBarByOther,
      },
      globalStats,
    );

    tierAverageSection.hidden = false;
    tierAverageTitle.textContent = "Global average (benchmark)";
    tierAverageSample.textContent = isAll(selectedGame)
      ? `Based on ${globalStats.total} goals across all tiers and all games.`
      : `Based on ${globalStats.total} ${selectedGame} goals across all tiers.`;
  }

  applyFilterModeUi();
}

async function main() {
  try {
    const response = await fetch(CSV_PATH);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const csvText = await response.text();
    const table = parseCsv(csvText);
    const headers = table[0];
    const records = table.slice(1);

    const index = {
      tier: headers.indexOf("Tier"),
      player1: headers.indexOf("Player 1"),
      player2: headers.indexOf("Player 2"),
      completedBy: headers.indexOf("Completed by"),
      game: headers.indexOf("Game"),
    };

    rows = records.map((record) => ({
      tier: record[index.tier] || "",
      player1: record[index.player1] || "",
      player2: record[index.player2] || "",
      completedBy: record[index.completedBy] || "",
      game: record[index.game] || "",
    }));

    populateFilters(rows);
    applyFilterModeUi();
    updateDashboard();

    playerSelect.addEventListener("change", () => {
      filterMode = "player";
      const playerTier = getMostCommonTierForPlayer(playerSelect.value);
      if (playerTier) {
        tierSelect.value = playerTier;
      }
      updateDashboard();
    });
    tierSelect.addEventListener("change", () => {
      filterMode = "tier";
      updateDashboard();
    });
    gameSelect.addEventListener("change", updateDashboard);
    playerUsingBadge.addEventListener("click", () => {
      filterMode = "player";
      updateDashboard();
    });
    tierUsingBadge.addEventListener("click", () => {
      filterMode = "tier";
      updateDashboard();
    });

    setStatus("Data loaded.");
  } catch (error) {
    setStatus(`Could not load CSV data: ${error.message}`, true);
  }
}

main();
