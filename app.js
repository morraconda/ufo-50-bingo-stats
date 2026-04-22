const CSV_PATH = "./UFO 50 Bingo S3 stats - Data.csv";
const GOAL_TYPES_PATH = "./goal types.csv";

const playerShowAll = document.getElementById("playerShowAll");
const tierShowAll = document.getElementById("tierShowAll");
const gameShowAll = document.getElementById("gameShowAll");
const goalTypeShowAll = document.getElementById("goalTypeShowAll");
const playerSelect = document.getElementById("playerSelect");
const tierSelect = document.getElementById("tierSelect");
const gameSelect = document.getElementById("gameSelect");
const goalTypeSelect = document.getElementById("goalTypeSelect");
const averageModeSelect = document.getElementById("averageModeSelect");
const summaryText = document.getElementById("summaryText");
const sampleSizeEl = document.getElementById("sampleSize");
const statusEl = document.getElementById("status");
const allBarsSection = document.getElementById("allBarsSection");
const allBarsContainer = document.getElementById("allBarsContainer");
const allBarsSummaryText = document.getElementById("allBarsSummaryText");
const sortBySelect = document.getElementById("sortBySelect");
const sortOrderBtn = document.getElementById("sortOrderBtn");

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
let goalTypes = new Map(); // Maps goal name to goal type
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
  if (statusEl) {
    statusEl.textContent = message;
    statusEl.classList.toggle("error", isError);
  } else {
    console.error("Status element not found:", message);
  }
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
  const types = new Set();

  for (const row of dataRows) {
    if (row.player1) players.add(row.player1.trim());
    if (row.player2) players.add(row.player2.trim());
    if (row.tier) tiers.add(row.tier.trim());
    if (row.game) games.add(row.game.trim());
    if (row.goal && goalTypes.has(row.goal)) {
      types.add(goalTypes.get(row.goal));
    }
  }

  const sortedPlayers = [...players].sort((a, b) => a.localeCompare(b));
  const sortedTiers = [...tiers].sort((a, b) => a.localeCompare(b));
  const sortedGames = [...games].sort((a, b) => a.localeCompare(b));
  const sortedTypes = [...types].sort((a, b) => a.localeCompare(b));
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

  goalTypeSelect.innerHTML = sortedTypes
    .map((type) => `<option value="${type}">${type}</option>`)
    .join("");
  goalTypeSelect.insertAdjacentHTML("afterbegin", '<option value="All">All</option>');

  tierSelect.value = "All";
  gameSelect.value = "All";
  goalTypeSelect.value = "All";
}

function getGoalType(row) {
  if (row.sourceGoal.toLowerCase() && goalTypes.has(row.sourceGoal.toLowerCase())) {
    return goalTypes.get(row.sourceGoal.toLowerCase());
  }
  return null;
}

function updateGoalTypeSelector() {
  const selectedGame = gameSelect.value;
  
  // Get all types for the selected game
  let availableTypes = new Set();
  
  for (const row of rows) {
    if (matchesGame(row, selectedGame)) {
      const type = getGoalType(row);
      if (type) {
        availableTypes.add(type);
      }
    }
  }

  const standardDifficulties = ["Easy", "Medium", "Hard", "Very Hard"];
  const generalDifficulties = ["Gift", "Gold", "Cherry", "Boss", "Level", "Theme"];
  
  let typesToShow;
  if (selectedGame === "General") {
    typesToShow = generalDifficulties
  } else {
    typesToShow = standardDifficulties
  }
  
  // Update the select element
  goalTypeSelect.innerHTML = typesToShow
    .map((type) => `<option value="${type}">${type}</option>`)
    .join("");
  goalTypeSelect.insertAdjacentHTML("afterbegin", '<option value="All">All</option>');
  
  // Reset to "All" when game changes
  goalTypeSelect.value = "All";
}

function applyFilterModeUi() {
  const usingPlayer = filterMode === "player";
  const selectedPlayer = playerSelect.value;
  const selectedTier = tierSelect.value;
  const selectedGame = gameSelect.value;
  const selectedType = goalTypeSelect.value;

  // Update visual styling for active selector
  playerSelect.classList.toggle("active-mode", usingPlayer);
  tierSelect.classList.toggle("active-mode", !usingPlayer);

  let summary = "";
  
  if (usingPlayer) {
    summary += `Player: ${selectedPlayer}`;
  } else {
    summary += `Tier: ${selectedTier}`;
  }
  
  summary += ` | Game: ${selectedGame}`;
  summary += ` | Type: ${selectedType}`;
  
  summaryText.textContent = summary;
}

function deactivateAllShowAllBoxes(exceptBox) {
  const boxes = [playerShowAll, tierShowAll, gameShowAll, goalTypeShowAll];
  boxes.forEach(box => {
    if (box !== exceptBox) {
      box.classList.remove("active");
    }
  });
}

function getAllFilterValues(type) {
  const values = new Set();
  
  if (type === "player") {
    for (const row of rows) {
      if (row.player1) values.add(row.player1.trim());
      if (row.player2) values.add(row.player2.trim());
    }
  } else if (type === "tier") {
    values.add("All");
    for (const row of rows) {
      if (row.tier) values.add(row.tier.trim());
    }
  } else if (type === "game") {
    values.add("All");
    for (const row of rows) {
      if (row.game) values.add(row.game.trim());
    }
  } else if (type === "goalType") {
    values.add("All");
    const selectedGame = gameSelect.value;
    const types = new Set();
    
    for (const row of rows) {
      // Only include types from the selected game
      if (matchesGame(row, selectedGame)) {
        const rowType = getGoalType(row);
        if (rowType) {
          types.add(rowType);
        }
      }
    }
    
    const standardDifficulties = ["Easy", "Medium", "Hard", "Very Hard"];
    const generalDifficulties = ["Gift", "Gold", "Cherry", "Boss", "Level", "Theme"];
    
    // Show appropriate types based on game selection
    if (selectedGame === "General") {
      generalDifficulties.forEach(type => {
        if (types.has(type)) values.add(type);
      });
    } else {
      standardDifficulties.forEach(type => {
        if (types.has(type)) values.add(type);
      });
    }
  }
  
  return [...values].sort((a, b) => {
    // Sort tiers in logical order: All, A, B1, B2, C1, C2
    if (type === "tier") {
      const order = { "All": 0, "A": 1, "B1": 2, "B2": 3, "C1": 4, "C2": 5 };
      const aOrder = order[a] || 999;
      const bOrder = order[b] || 999;
      if (aOrder !== 999 || bOrder !== 999) {
        return aOrder - bOrder;
      }
    }
    // Sort games with "All" first
    if (type === "game") {
      if (a === "All") return -1;
      if (b === "All") return 1;
    }
    // Sort goal types with "All" first, then standard order
    if (type === "goalType") {
      if (a === "All") return -1;
      if (b === "All") return 1;
      const order = { "Easy": 0, "Medium": 1, "Hard": 2, "Very Hard": 3, "Gift": 4, "Gold": 5, "Cherry": 6, "Boss": 7, "Level": 8, "Theme": 9 };
      const aOrder = order[a] || 999;
      const bOrder = order[b] || 999;
      if (aOrder !== 999 || bOrder !== 999) {
        return aOrder - bOrder;
      }
    }
    return a.localeCompare(b);
  });
}

function showAllBars(filterType) {
  const selectedGame = gameSelect.value;
  const selectedType = goalTypeSelect.value;
  const allValues = getAllFilterValues(filterType);
  
  allBarsContainer.innerHTML = "";
  
  // Update summary text
  let summaryText = "";
  if (filterType === "player") {
    summaryText = isAll(selectedGame)
      ? isAll(selectedType)
        ? "Showing all players across all games and all goal types"
        : `Showing all players across all games for ${selectedType} goals`
      : isAll(selectedType)
        ? `Showing all players in ${selectedGame} across all goal types`
        : `Showing all players in ${selectedGame} for ${selectedType} goals`;
  } else if (filterType === "tier") {
    summaryText = isAll(selectedGame)
      ? isAll(selectedType)
        ? "Showing all tiers across all games and all goal types"
        : `Showing all tiers across all games for ${selectedType} goals`
      : isAll(selectedType)
        ? `Showing all tiers in ${selectedGame} across all goal types`
        : `Showing all tiers in ${selectedGame} for ${selectedType} goals`;
  } else if (filterType === "game") {
    summaryText = isAll(selectedType)
      ? "Showing all games across all goal types"
      : `Showing all games for ${selectedType} goals`;
  } else if (filterType === "goalType") {
    summaryText = isAll(selectedGame)
      ? "Showing all goal types across all games"
      : `Showing all goal types in ${selectedGame}`;
  }
  
  allBarsSummaryText.textContent = summaryText;
  
  // Collect all bar data with stats
  const barData = [];
  allValues.forEach(value => {
    const filtered = rows.filter(row => {
      // For game filter type, show all rows for that game
      if (filterType === "game") {
        const sameGame = isAll(value) || row.game === value;
        if (!sameGame) return false;
        
        const rowType = getGoalType(row);
        const sameType = isAll(selectedType) || rowType === selectedType;
        return sameType;
      }
      
      // For goal type filter type, show all rows for that type
      if (filterType === "goalType") {
        const rowType = getGoalType(row);
        const sameType = isAll(value) || rowType === value;
        if (!sameType) return false;
        
        const sameGame = matchesGame(row, selectedGame);
        return sameGame;
      }
      
      // Original logic for player and tier
      const sameGame = matchesGame(row, selectedGame);
      if (!sameGame) return false;

      const rowType = getGoalType(row);
      const sameType = isAll(selectedType) || rowType === selectedType;
      if (!sameType) return false;

      if (filterType === "player") {
        const playerInMatch =
          normalize(row.player1) === normalize(value) ||
          normalize(row.player2) === normalize(value);
        return playerInMatch;
      }

      if (isAll(value)) {
        return true;
      }
      return normalize(row.tier) === normalize(value);
    });

    const stats = computeOutcomeStats(filtered, filterType === "player" ? "player" : "tier", filterType === "player" ? value : "");
    
    if (stats.total > 0) {
      let displayName = value;
      if (filterType === "tier") {
        displayName = `Tier ${value}`;
      }
      
      // Truncate name to 15 characters for consistent sizing
      let truncatedName = displayName;
      if (displayName.length > 15) {
        truncatedName = displayName.substring(0, 15);
      }
      
      barData.push({
        value: value,
        displayName: displayName,
        truncatedName: truncatedName,
        stats: stats
      });
    }
  });
  
  // Sort the bar data
  const sortBy = sortBySelect.value;
  const sortOrder = sortOrderBtn.textContent;
  
  barData.sort((a, b) => {
    let comparison = 0;
    
    if (sortBy === "name") {
      comparison = a.displayName.localeCompare(b.displayName);
    } else if (sortBy === "completed") {
      comparison = a.stats.pctSelected - b.stats.pctSelected;
    } else if (sortBy === "uncompleted") {
      comparison = a.stats.pctNone - b.stats.pctNone;
    } else if (sortBy === "byOpponent") {
      comparison = a.stats.pctOther - b.stats.pctOther;
    }
    
    return sortOrder === "Desc" ? -comparison : comparison;
  });
  
  // Render sorted bars
  barData.forEach(data => {
    const barContainer = document.createElement("div");
    barContainer.className = "all-bar-item";
    
    const title = document.createElement("h3");
    title.className = "all-bar-title";
    title.textContent = data.truncatedName;
    title.title = data.displayName; // Add tooltip with full name
    
    const track = document.createElement("div");
    track.className = "stacked-track";
    
    const byPlayerSeg = document.createElement("div");
    byPlayerSeg.className = "stacked-segment by-player";
    byPlayerSeg.style.width = `${data.stats.pctSelected}%`;
    byPlayerSeg.textContent = data.stats.pctSelected <= 0 ? "" : `${data.stats.pctSelected.toFixed(1)}%`;
    
    const uncompletedSeg = document.createElement("div");
    uncompletedSeg.className = "stacked-segment uncompleted";
    uncompletedSeg.style.width = `${data.stats.pctNone}%`;
    uncompletedSeg.textContent = data.stats.pctNone <= 0 ? "" : `${data.stats.pctNone.toFixed(1)}%`;
    
    const byOtherSeg = document.createElement("div");
    byOtherSeg.className = "stacked-segment by-other";
    byOtherSeg.style.width = `${data.stats.pctOther}%`;
    byOtherSeg.textContent = data.stats.pctOther <= 0 ? "" : `${data.stats.pctOther.toFixed(1)}%`;
    
    track.appendChild(byPlayerSeg);
    track.appendChild(uncompletedSeg);
    track.appendChild(byOtherSeg);
    
    barContainer.appendChild(title);
    barContainer.appendChild(track);
    
    allBarsContainer.appendChild(barContainer);
  });
  
  allBarsSection.hidden = false;
}

function updateDashboard() {
  const selectedPlayer = playerSelect.value;
  const selectedTier = tierSelect.value;
  const selectedGame = gameSelect.value;
  const selectedType = goalTypeSelect.value;

  const filtered = rows.filter((row) => {
    const sameGame = matchesGame(row, selectedGame);
    if (!sameGame) return false;

    const rowType = getGoalType(row);
    const sameType = isAll(selectedType) || rowType === selectedType;
    if (!sameType) return false;

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
          ? isAll(selectedType)
            ? `Based on ${stats.total} goals where ${selectedPlayer} played across all games.`
            : `Based on ${stats.total} ${selectedType} goals where ${selectedPlayer} played across all games.`
          : isAll(selectedType)
            ? `Based on ${stats.total} goals where ${selectedPlayer} played ${selectedGame}.`
            : `Based on ${stats.total} ${selectedType} goals where ${selectedPlayer} played ${selectedGame}.`
        : isAll(selectedTier)
          ? isAll(selectedGame)
            ? isAll(selectedType)
              ? `Based on ${stats.total} goals across all tiers and all games.`
              : `Based on ${stats.total} ${selectedType} goals across all tiers and all games.`
            : isAll(selectedType)
              ? `Based on ${stats.total} ${selectedGame} goals across all tiers.`
              : `Based on ${stats.total} ${selectedType} goals in ${selectedGame} across all tiers.`
          : isAll(selectedGame)
            ? isAll(selectedType)
              ? `Based on ${stats.total} goals from tier ${selectedTier} across all games.`
              : `Based on ${stats.total} ${selectedType} goals from tier ${selectedTier} across all games.`
            : isAll(selectedType)
              ? `Based on ${stats.total} ${selectedGame} goals from tier ${selectedTier}.`
              : `Based on ${stats.total} ${selectedType} goals in ${selectedGame} from tier ${selectedTier}.`;

  const averageMode = averageModeSelect.value;
  
  // Use the same filtering logic as the main dashboard
  const baseFiltered = rows.filter((row) => {
    const sameGame = matchesGame(row, selectedGame);
    if (!sameGame) return false;

    const rowType = getGoalType(row);
    const sameType = isAll(selectedType) || rowType === selectedType;
    if (!sameType) return false;

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

  let avgFiltered;
  let avgTitle;
  let avgSample;
  
  if (averageMode === "tier") {
    // Show average across all tiers (respecting current game/type selections)
    avgFiltered = rows.filter((row) => {
      const sameGame = matchesGame(row, selectedGame);
      if (!sameGame) return false;

      const rowType = getGoalType(row);
      const sameType = isAll(selectedType) || rowType === selectedType;
      return sameType;
    });
    avgTitle = filterMode === "player" ? "Tier average (benchmark)" : "Global average (benchmark)";
    avgSample = isAll(selectedGame)
      ? isAll(selectedType)
        ? `Based on ${avgFiltered.length} goals across all tiers and all games.`
        : `Based on ${avgFiltered.length} ${selectedType} goals across all tiers and all games.`
      : isAll(selectedType)
        ? `Based on ${avgFiltered.length} ${selectedGame} goals across all tiers.`
        : `Based on ${avgFiltered.length} ${selectedType} goals in ${selectedGame} across all tiers.`;
  } else if (averageMode === "game") {
    // Show average across all games (respecting current tier/type selections)
    avgFiltered = rows.filter((row) => {
      if (filterMode === "player") {
        const playerInMatch =
          normalize(row.player1) === normalize(selectedPlayer) ||
          normalize(row.player2) === normalize(selectedPlayer);
        if (!playerInMatch) return false;
      }

      const rowType = getGoalType(row);
      const sameType = isAll(selectedType) || rowType === selectedType;
      if (!sameType) return false;

      if (isAll(selectedTier)) {
        return true;
      }
      return normalize(row.tier) === normalize(selectedTier);
    });
    avgTitle = "Game average";
    avgSample = isAll(selectedTier)
      ? isAll(selectedType)
        ? `Based on ${avgFiltered.length} goals across all games and all types.`
        : `Based on ${avgFiltered.length} ${selectedType} goals across all games.`
      : isAll(selectedType)
        ? `Based on ${avgFiltered.length} goals in all tiers across all types.`
        : `Based on ${avgFiltered.length} ${selectedType} goals in all tiers.`;
  } else if (averageMode === "difficulty") {
    // Show average across all goal types (respecting current game/tier selections)
    avgFiltered = rows.filter((row) => {
      const sameGame = matchesGame(row, selectedGame);
      if (!sameGame) return false;

      if (filterMode === "player") {
        const playerInMatch =
          normalize(row.player1) === normalize(selectedPlayer) ||
          normalize(row.player2) === normalize(selectedPlayer);
        if (!playerInMatch) return false;
      }

      if (isAll(selectedTier)) {
        return true;
      }
      return normalize(row.tier) === normalize(selectedTier);
    });
    avgTitle = "Difficulty average";
    avgSample = isAll(selectedTier)
      ? isAll(selectedGame)
        ? `Based on ${avgFiltered.length} goals across all goal types and all games.`
        : `Based on ${avgFiltered.length} goals across all goal types in ${selectedGame}.`
      : isAll(selectedGame)
        ? `Based on ${avgFiltered.length} goals in tier ${selectedTier} across all goal types.`
        : `Based on ${avgFiltered.length} goals in tier ${selectedTier} in ${selectedGame}.`;
  }
  
  const avgStats = computeOutcomeStats(avgFiltered, "tier", selectedPlayer);
  renderBar(
    {
      byPlayerEl: tierAvgBarByPlayer,
      uncompletedEl: tierAvgBarUncompleted,
      byOtherEl: tierAvgBarByOther,
    },
    avgStats,
  );

  tierAverageSection.hidden = false;
  tierAverageTitle.textContent = avgTitle;
  tierAverageSample.textContent = avgSample;

  applyFilterModeUi();
}

async function main() {
  try {
    // Load goal types
    const goalTypesResponse = await fetch(GOAL_TYPES_PATH);
    if (goalTypesResponse.ok) {
      const goalTypesCsvText = await goalTypesResponse.text();
      const goalTypesTable = parseCsv(goalTypesCsvText);
      const goalTypesHeaders = goalTypesTable[0];
      const goalTypesRecords = goalTypesTable.slice(1);

      const goalIndex = goalTypesHeaders.indexOf("Goal");
      const typeIndex = goalTypesHeaders.indexOf("Type");

      if (goalIndex >= 0 && typeIndex >= 0) {
        for (const record of goalTypesRecords) {
          const goal = record[goalIndex] || "";
          const type = record[typeIndex] || "";
          if (goal) {
            goalTypes.set(goal.trim(), type.trim());
          }
        }
      }
    }

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
      goal: headers.indexOf("Goal"),
      sourceGoal: headers.indexOf("Source goal"),
    };

    rows = records.map((record) => ({
      tier: record[index.tier] || "",
      player1: record[index.player1] || "",
      player2: record[index.player2] || "",
      completedBy: record[index.completedBy] || "",
      game: record[index.game] || "",
      goal: record[index.goal] || "",
      sourceGoal: record[index.sourceGoal] || "",
    }));

    populateFilters(rows);
    applyFilterModeUi();
    updateGoalTypeSelector();
    updateDashboard();

    playerSelect.addEventListener("change", () => {
      filterMode = "player";
      const playerTier = getMostCommonTierForPlayer(playerSelect.value);
      if (playerTier) {
        tierSelect.value = playerTier;
      }
      updateDashboard();
    });
    playerSelect.addEventListener("click", (e) => {
      if (filterMode === "player" && e.target === playerSelect) {
        // If already in player mode and clicking player select, switch to tier mode
        filterMode = "tier";
        updateDashboard();
      }
    });
    tierSelect.addEventListener("change", () => {
      filterMode = "tier";
      updateDashboard();
    });
    tierSelect.addEventListener("click", (e) => {
      if (filterMode === "tier" && e.target === tierSelect) {
        // If already in tier mode and clicking tier select, switch to player mode
        filterMode = "player";
        updateDashboard();
      }
    });
    gameSelect.addEventListener("change", () => {
      updateGoalTypeSelector();
      updateDashboard();
      // Refresh Show All bars if active
      const activeShowAll = document.querySelector('.using-badge.active');
      if (activeShowAll) {
        const filterType = activeShowAll.id.replace('ShowAll', '').toLowerCase();
        showAllBars(filterType);
      }
    });
    goalTypeSelect.addEventListener("change", () => {
      updateDashboard();
      // Refresh Show All bars if active
      const activeShowAll = document.querySelector('.using-badge.active');
      if (activeShowAll) {
        const filterType = activeShowAll.id.replace('ShowAll', '').toLowerCase();
        showAllBars(filterType);
      }
    });
    averageModeSelect.addEventListener("change", updateDashboard);
        
    playerShowAll.addEventListener("click", () => {
      if (playerShowAll.classList.contains("active")) {
        playerShowAll.classList.remove("active");
        allBarsSection.hidden = true;
      } else {
        deactivateAllShowAllBoxes(playerShowAll);
        playerShowAll.classList.add("active");
        showAllBars("player");
      }
    });
    tierShowAll.addEventListener("click", () => {
      if (tierShowAll.classList.contains("active")) {
        tierShowAll.classList.remove("active");
        allBarsSection.hidden = true;
      } else {
        deactivateAllShowAllBoxes(tierShowAll);
        tierShowAll.classList.add("active");
        showAllBars("tier");
      }
    });
    gameShowAll.addEventListener("click", () => {
      if (gameShowAll.classList.contains("active")) {
        gameShowAll.classList.remove("active");
        allBarsSection.hidden = true;
      } else {
        deactivateAllShowAllBoxes(gameShowAll);
        gameShowAll.classList.add("active");
        showAllBars("game");
      }
    });
    goalTypeShowAll.addEventListener("click", () => {
      if (goalTypeShowAll.classList.contains("active")) {
        goalTypeShowAll.classList.remove("active");
        allBarsSection.hidden = true;
      } else {
        deactivateAllShowAllBoxes(goalTypeShowAll);
        goalTypeShowAll.classList.add("active");
        showAllBars("goalType");
      }
    });

    // Sorting controls event listeners
    sortBySelect.addEventListener("change", () => {
      if (!allBarsSection.hidden) {
        const activeFilter = document.querySelector('.using-badge.active');
        if (activeFilter) {
          const filterType = activeFilter.id.replace('ShowAll', '').toLowerCase();
          showAllBars(filterType);
        }
      }
    });

    sortOrderBtn.addEventListener("click", () => {
      // Toggle between Asc and Desc
      const currentOrder = sortOrderBtn.textContent;
      sortOrderBtn.textContent = currentOrder === "Asc" ? "Desc" : "Asc";
      sortOrderBtn.classList.toggle("active", currentOrder === "Asc");
      
      if (!allBarsSection.hidden) {
        const activeFilter = document.querySelector('.using-badge.active');
        if (activeFilter) {
          const filterType = activeFilter.id.replace('ShowAll', '').toLowerCase();
          showAllBars(filterType);
        }
      }
    });

    setStatus("Data loaded.");
  } catch (error) {
    setStatus(`Could not load CSV data: ${error.message}`, true);
  }
}

main();
