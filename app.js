
// Game to image number mapping (copied from graph.js)
const gameImageMap = {
  "Barbuta": 1, "Bug Hunter": 2, "Ninpek": 3, "Paint Chase": 4, "Magic Garden": 5,
  "Mortol": 6, "Velgress": 7, "Planet Zoldath": 8, "Attactics": 9, "Devilition": 10,
  "Kick Club": 11, "Avianos": 12, "Mooncat": 13, "Bushido Ball": 14, "Block Koala": 15,
  "Camouflage": 16, "Campanella": 17, "Golfaria": 18, "The Big Bell Race": 19, "Warptank": 20,
  "Waldorf's Journey": 21, "Porgy": 22, "Onion Delivery": 23, "Caramel Caramel": 24, "Party House": 25,
  "Hot Foot": 26, "Divers": 27, "Rail Heist": 28, "Vainger": 29, "Rock On! Island": 30,
  "Pingolf": 31, "Mortol 2": 32, "Fist Hell": 33, "Overbold": 34, "Campanella 2": 35,
  "Hyper Contender": 36, "Valbrace": 37, "Rakshasa": 38, "Star Waspir": 39, "Grimstone": 40,
  "Lords of Diskonia": 41, "Night Manor": 42, "Elfazar's Hat": 43, "Pilot Quest": 44, "Mini and Max": 45,
  "Combatants": 46, "Quibble Race": 47, "Seaside Drive": 48, "Campanella 3": 49, "Cyber Owls": 50, "General": 51
};

const playerShowAll = document.getElementById("playerShowAll");
const tierShowAll = document.getElementById("tierShowAll");
const gameShowAll = document.getElementById("gameShowAll");
const goalTypeShowAll = document.getElementById("goalTypeShowAll");
const playerSwitchBtn = document.getElementById("playerSwitchBtn");
const tierSwitchBtn = document.getElementById("tierSwitchBtn");
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
const showCompletionOnly = document.getElementById("showCompletionOnly");

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
let filterMode = "player";

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
    byOther: byOtherPlayer,
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

  playerSelect.value = sortedPlayers[0] || "";
  tierSelect.value = "All";
  gameSelect.value = "All";
  goalTypeSelect.value = "All";
}

function getGoalType(row) {
  const sourceGoal = (row.sourceGoal || row.goal || "").trim().toLowerCase();
  
  // Try exact match first
  if (sourceGoal && goalTypes.has(sourceGoal)) {
    return goalTypes.get(sourceGoal);
  }
  
  // If no exact match, try partial matching for variations
  if (sourceGoal) {
    for (const [goalName, goalType] of goalTypes.entries()) {
      // Check if one string contains the other
      if (goalName.includes(sourceGoal) || sourceGoal.includes(goalName)) {
        return goalType;
      }
    }
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

  // Update switch button text and highlighting
  if (usingPlayer) {
    playerSwitchBtn.textContent = "Selected";
    playerSwitchBtn.classList.add("active");
    tierSwitchBtn.textContent = "";
    tierSwitchBtn.classList.remove("active");
  } else {
    playerSwitchBtn.textContent = "";
    playerSwitchBtn.classList.remove("active");
    tierSwitchBtn.textContent = "Selected";
    tierSwitchBtn.classList.add("active");
  }

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
    // Add all games from gameImageMap (including those without data)
    for (const gameName of Object.keys(gameImageMap)) {
      if (gameName !== "General") { // Skip General as it's handled separately
        values.add(gameName);
      }
    }
    // Also add any games found in data that might not be in the map
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
        // Also filter by current player/tier selection
        let includeRow = false;
        if (filterMode === "player") {
          const selectedPlayer = playerSelect.value;
          includeRow = normalize(row.player1) === normalize(selectedPlayer) ||
                     normalize(row.player2) === normalize(selectedPlayer);
        } else if (filterMode === "tier") {
          const selectedTier = tierSelect.value;
          includeRow = isAll(selectedTier) || normalize(row.tier) === normalize(selectedTier);
        } else {
          includeRow = true;
        }
        
        if (includeRow) {
          const rowType = getGoalType(row);
          if (rowType) {
            types.add(rowType);
          }
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
      if (aOrder !== 999 && bOrder !== 999) {
        return aOrder - bOrder;
      }
      if (aOrder !== 999) return -1;
      if (bOrder !== 999) return 1;
    }
    return a.localeCompare(b);
  });
}

function showAllBars(filterType) {
  const selectedGame = gameSelect.value;
  const selectedType = goalTypeSelect.value;
  const sortBy = sortBySelect.value;
  const allValues = getAllFilterValues(filterType);
  
  allBarsContainer.innerHTML = "";
  
  // Update summary text
  let summaryText = "";
  if (filterType === "player") {
    if (filterMode === "tier") {
      const selectedTier = tierSelect.value;
      summaryText = isAll(selectedGame)
        ? isAll(selectedType)
          ? `Showing all players in tier ${selectedTier} across all games and all goal types`
          : `Showing all players in tier ${selectedTier} across all games for ${selectedType} goals`
        : isAll(selectedType)
          ? `Showing all players in tier ${selectedTier} in ${selectedGame} across all goal types`
          : `Showing all players in tier ${selectedTier} in ${selectedGame} for ${selectedType} goals`;
    } else {
      summaryText = isAll(selectedGame)
        ? isAll(selectedType)
          ? "Showing all players across all games and all goal types"
          : `Showing all players across all games for ${selectedType} goals`
        : isAll(selectedType)
          ? `Showing all players in ${selectedGame} across all goal types`
          : `Showing all players in ${selectedGame} for ${selectedType} goals`;
    }
  } else if (filterType === "tier") {
    if (filterMode === "player") {
      const selectedPlayer = playerSelect.value;
      summaryText = isAll(selectedGame)
        ? isAll(selectedType)
          ? `Showing all tiers for ${selectedPlayer} across all games and all goal types`
          : `Showing all tiers for ${selectedPlayer} across all games for ${selectedType} goals`
        : isAll(selectedType)
          ? `Showing all tiers for ${selectedPlayer} in ${selectedGame} across all goal types`
          : `Showing all tiers for ${selectedPlayer} in ${selectedGame} for ${selectedType} goals`;
    } else {
      summaryText = isAll(selectedGame)
        ? isAll(selectedType)
          ? "Showing all tiers across all games and all goal types"
          : `Showing all tiers across all games for ${selectedType} goals`
        : isAll(selectedType)
          ? `Showing all tiers in ${selectedGame} across all goal types`
          : `Showing all tiers in ${selectedGame} for ${selectedType} goals`;
    }
  } else if (filterType === "game") {
    if (filterMode === "player") {
      const selectedPlayer = playerSelect.value;
      summaryText = isAll(selectedType)
        ? `Showing all games for ${selectedPlayer} across all goal types`
        : `Showing all games for ${selectedPlayer} for ${selectedType} goals`;
    } else {
      const selectedTier = tierSelect.value;
      summaryText = isAll(selectedType)
        ? `Showing all games in tier ${selectedTier} across all goal types`
        : `Showing all games in tier ${selectedTier} for ${selectedType} goals`;
    }
  } else if (filterType === "goalType") {
    if (filterMode === "player") {
      const selectedPlayer = playerSelect.value;
      summaryText = isAll(selectedGame)
        ? `Showing all goal types for ${selectedPlayer} across all games`
        : `Showing all goal types for ${selectedPlayer} in ${selectedGame}`;
    } else {
      summaryText = isAll(selectedGame)
        ? "Showing all goal types across all games"
        : `Showing all goal types in ${selectedGame}`;
    }
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
        if (!sameType) return false;
        
        // Respect current player/tier selections
        if (filterMode === "player") {
          const selectedPlayer = playerSelect.value;
          const playerInMatch =
            normalize(row.player1) === normalize(selectedPlayer) ||
            normalize(row.player2) === normalize(selectedPlayer);
          return playerInMatch;
        } else if (filterMode === "tier") {
          const selectedTier = tierSelect.value;
          if (isAll(selectedTier)) {
            return true;
          }
          return normalize(row.tier) === normalize(selectedTier);
        }
        
        return true;
      }
      
      // For goal type filter type, show all rows for that type
      if (filterType === "goalType") {
        const rowType = getGoalType(row);
        const sameType = isAll(value) || rowType === value;
        if (!sameType) return false;
        
        const sameGame = matchesGame(row, selectedGame);
        if (!sameGame) return false;
        
        // Respect current player/tier selections
        if (filterMode === "player") {
          const selectedPlayer = playerSelect.value;
          const playerInMatch =
            normalize(row.player1) === normalize(selectedPlayer) ||
            normalize(row.player2) === normalize(selectedPlayer);
          return playerInMatch;
        } else if (filterMode === "tier") {
          const selectedTier = tierSelect.value;
          if (isAll(selectedTier)) {
            return true;
          }
          return normalize(row.tier) === normalize(selectedTier);
        }
        
        return true;
      }
      
      // Original logic for player and tier
      const sameGame = matchesGame(row, selectedGame);
      if (!sameGame) return false;

      const rowType = getGoalType(row);
      const sameType = isAll(selectedType) || rowType === selectedType;
      if (!sameType) return false;

      if (filterType === "player") {
        if (isAll(value)) {
          // For "All" players, include all rows that match game and type criteria
          return true;
        }
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

    // Debug: Check filtered array before computing stats
    if (sortBy === "goalCount") {
      console.log('DEBUG: Filtered array for value:', value, 'filterType:', filterType);
      console.log('Filtered array length:', filtered.length);
      console.log('Filtered array type:', typeof filtered);
      console.log('Is array?', Array.isArray(filtered));
      if (filtered.length > 0) {
        console.log('First few filtered items:', filtered.slice(0, 3));
      }
    }
    
    const stats = computeOutcomeStats(filtered, filterMode, filterMode === "player" ? playerSelect.value : tierSelect.value);
    
    // Debug: Check for fractional totals
    if (sortBy === "goalCount" && stats.total !== Math.floor(stats.total)) {
      console.log('DEBUG: Fractional total detected:', stats.total, 'for value:', value, 'filterType:', filterType);
      console.log('Filtered rows length:', filtered.length);
      console.log('Stats object:', stats);
    }
    
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
      stats: stats,
      hasData: stats.total > 0
    });
  });
  
  // Sort the bar data
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
    } else if (sortBy === "goalCount") {
      comparison = a.stats.total - b.stats.total;
    }
    
    return sortOrder === "Desc" ? -comparison : comparison;
  });
  
  // Render sorted bars
  barData.forEach(data => {
    const barContainer = document.createElement("div");
    barContainer.className = "all-bar-item";
    
    const title = document.createElement("h3");
    title.className = "all-bar-title";
    
    // Use game image for game filter type (but not for "All")
    if (filterType === "game" && !isAll(data.value)) {
      const img = document.createElement("img");
      const imageNumber = gameImageMap[data.value] || "1"; // Fallback to 1.png
      img.src = `./graph/disks/${imageNumber}.png`;
      img.alt = data.displayName;
      img.className = "game-icon";
      img.title = data.displayName; // Tooltip with full name
      title.appendChild(img);
    } else {
      title.textContent = data.truncatedName;
      title.title = data.displayName; // Add tooltip with full name
    }
    
    // Add total count on the left for all sorts
    const totalCount = document.createElement("div");
    totalCount.className = "total-count";
    totalCount.textContent = data.stats.total;
    barContainer.appendChild(totalCount);
    
    barContainer.appendChild(title);
    
    // Check if this item has no data
    if (!data.hasData) {
      // For games with no data, show just the "0" count and no bar
      const emptyTrack = document.createElement("div");
      emptyTrack.className = "empty-track";
      emptyTrack.textContent = "No data";
      barContainer.appendChild(emptyTrack);
    } else {
      // Games with data get a normal track
      const track = document.createElement("div");
      
      if (showCompletionOnly.checked) {
        // Show completion + uncompleted bar (2 segments)
        track.className = "completion-track";
      
        // Combine green (player) and red (opponent) for completion view
        let completedPercentage = data.stats.pctSelected + data.stats.pctOther;
        
        const completionBar = document.createElement("div");
        completionBar.className = "completion-bar";
        completionBar.style.width = `${completedPercentage}%`;
        completionBar.textContent = completedPercentage <= 0 ? "" : `${completedPercentage.toFixed(1)}%`;
        
        const uncompletedBar = document.createElement("div");
        uncompletedBar.className = "completion-uncompleted";
        uncompletedBar.style.width = `${data.stats.pctNone}%`;
        uncompletedBar.textContent = data.stats.pctNone <= 0 ? "" : `${data.stats.pctNone.toFixed(1)}%`;
        
        // Debug: Log what we're actually setting for completion view
        console.log('DEBUG: Completion bar display for', data.displayName);
        console.log('  completedPercentage:', completedPercentage, '->', completionBar.textContent);
        console.log('  pctNone:', data.stats.pctNone, '->', uncompletedBar.textContent);
        
        track.appendChild(completionBar);
        track.appendChild(uncompletedBar);
      } else {
        // Show 3-segment stacked bar
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
        
        // Debug: Log what we're actually setting
        console.log('DEBUG: Bar display for', data.displayName);
        console.log('  byPlayer:', data.stats.pctSelected, '->', byPlayerSeg.textContent);
        console.log('  uncompleted:', data.stats.pctNone, '->', uncompletedSeg.textContent);
        console.log('  byOther:', data.stats.pctOther, '->', byOtherSeg.textContent);
        
        track.appendChild(byPlayerSeg);
        track.appendChild(uncompletedSeg);
        track.appendChild(byOtherSeg);
      }
      
      barContainer.appendChild(track);
    }
    
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

    if (isAll(selectedTier) || isAll(selectedPlayer)) {
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
    // Load data from Google Sheets
    setStatus("Connecting to Google Sheets...");
    
    const { playerData, goalTypes: loadedGoalTypes } = await window.SheetsAPI.loadPlayerAndGoalData();
    
    // Update global variables
    rows = playerData;
    goalTypes = loadedGoalTypes;

    populateFilters(rows);
    applyFilterModeUi();
    updateGoalTypeSelector();
    updateDashboard();

    playerSelect.addEventListener("change", () => {
      // Update tier to show most common tier for selected player, but don't switch mode
      const playerTier = getMostCommonTierForPlayer(playerSelect.value);
      if (playerTier) {
        tierSelect.value = playerTier;
      }
      // Make player selector active when changing player
      playerSelect.classList.add("active-mode");
      tierSelect.classList.remove("active-mode");
      applyFilterModeUi();
      updateDashboard();
    });
    tierSelect.addEventListener("change", () => {
      // Force tier mode when changing tier
      filterMode = "tier";
      // Make tier selector active when changing tier
      tierSelect.classList.add("active-mode");
      playerSelect.classList.remove("active-mode");
      applyFilterModeUi();
      updateDashboard();
    });
        
    // Switch button click handlers - clicking empty button switches mode
    playerSwitchBtn.addEventListener("click", () => {
      console.log('Player switch button clicked, current mode:', filterMode);
      if (filterMode === "tier") {
        // If in tier mode, clicking empty player switch button switches to player mode
        filterMode = "player";
        applyFilterModeUi();
        updateDashboard();
      }
    });
    
    tierSwitchBtn.addEventListener("click", () => {
      console.log('Tier switch button clicked, current mode:', filterMode);
      if (filterMode === "player") {
        // If in player mode, clicking empty tier switch button switches to tier mode
        filterMode = "tier";
        applyFilterModeUi();
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
      console.log('Tier switch button clicked, current mode:', filterMode);
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

    // Display mode checkbox event listener
    showCompletionOnly.addEventListener("change", () => {
      if (!allBarsSection.hidden) {
        const activeFilter = document.querySelector('.using-badge.active');
        if (activeFilter) {
          const filterType = activeFilter.id.replace('ShowAll', '').toLowerCase();
          showAllBars(filterType);
        }
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

    setStatus("Data loaded from Google Sheets.");
  } catch (error) {
    setStatus(`Could not load data from Google Sheets: ${error.message}`, true);
  }
}

main();
