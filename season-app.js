import { renderAllBars, renderStackedBar } from "./lib/bars.js";
import { allBars, averagePanel, byId, fillSelect, mainBar, sampleSize, setStatus, summaryText } from "./lib/dom.js";
import { sortBars, sortGameOptions } from "./lib/sorting.js";
import { computeOutcomeStats } from "./lib/stats.js";
import { isAll } from "./lib/util.js";
import {
  barSelection,
  matchesGame,
  matchesPlayer,
  matchesTier,
  mostCommonTierForPlayer,
  selectRows,
  selectorOptions,
  showAllValues,
} from "./season/filters.js";
import {
  averagePanelText,
  barDisplayName,
  filterSummary,
  sampleSizeText,
  showAllSummary,
  truncateLabel,
} from "./season/labels.js";
import { loadSeasonRows } from "./season/sheets.js";
import { compareTiers, sortShowAllValues } from "./season/sorting.js";

const controls = {
  player: {
    select: byId("playerSelect"),
    switchBtn: byId("playerSwitchBtn"),
    showAll: byId("playerShowAll"),
  },
  tier: {
    select: byId("tierSelect"),
    switchBtn: byId("tierSwitchBtn"),
    showAll: byId("tierShowAll"),
  },
  game: {
    select: byId("gameSelect"),
    showAll: byId("gameShowAll"),
  },
};

let rows = [];
let filterMode = "tier";
let activeShowAll = null;

function seasonName() {
  return window.SEASON_CONFIG?.name || "this season";
}

function currentSelection() {
  return {
    mode: filterMode,
    player: controls.player.select.value,
    tier: controls.tier.select.value,
    game: controls.game.select.value,
  };
}

function populateSelectors() {
  const { players, tiers, games } = selectorOptions(rows);
  const sortedPlayers = [...players].sort((a, b) => a.localeCompare(b));

  fillSelect(controls.player.select, sortedPlayers, sortedPlayers[0] || "");
  fillSelect(controls.tier.select, ["All", ...[...tiers].sort(compareTiers)], "All");
  fillSelect(controls.game.select, ["All", ...sortGameOptions(games)], "All");
}

function applyFilterModeUi(selection) {
  const usingPlayer = selection.mode === "player";

  controls.player.select.classList.toggle("active-mode", usingPlayer);
  controls.tier.select.classList.toggle("active-mode", !usingPlayer);
  setSwitchButton(controls.player.switchBtn, usingPlayer);
  setSwitchButton(controls.tier.switchBtn, !usingPlayer);

  summaryText.textContent = filterSummary(selection);
}

function setSwitchButton(button, isDriving) {
  button.textContent = isDriving ? "Selected" : "";
  button.classList.toggle("active", isDriving);
}

function renderAveragePanel(selection) {
  const averageMode = averagePanel.modeSelect.value;

  const averageRows =
    averageMode === "game"
      // Across every game, holding the tier (and the player, in player mode) fixed
      ? rows.filter(
          (row) =>
            (selection.mode !== "player" || matchesPlayer(row, selection.player)) &&
            matchesTier(row, selection.tier),
        )
      // Across every tier and player, holding the game fixed
      : rows.filter((row) => matchesGame(row, selection.game));

  const { title, sample } = averagePanelText(selection, averageMode, averageRows.length, seasonName());

  renderStackedBar(averagePanel.bar, computeOutcomeStats(averageRows, "tier", selection.player));
  averagePanel.title.textContent = title;
  averagePanel.sample.textContent = sample;
  averagePanel.section.hidden = false;
}

function updateDashboard() {
  const selection = currentSelection();
  const stats = computeOutcomeStats(selectRows(rows, selection), selection.mode, selection.player);

  renderStackedBar(mainBar, stats);
  sampleSize.textContent = sampleSizeText(stats, selection, seasonName());
  renderAveragePanel(selection);
  applyFilterModeUi(selection);
}

function renderShowAll(filterType) {
  const selection = currentSelection();
  const completionOnly = allBars.completionOnly.checked;

  const bars = sortShowAllValues(showAllValues(rows, filterType), filterType).map((value) => {
    const displayName = barDisplayName(filterType, value);
    return {
      displayName,
      truncatedName: truncateLabel(displayName),
      // Game bars show the disk art instead of a label, except the "All" row
      diskGame: filterType === "game" && !isAll(value) ? value : null,
      // Rows come from this bar's own value, but the split stays in the page's mode
      stats: computeOutcomeStats(
        selectRows(rows, barSelection(selection, filterType, value)),
        selection.mode,
        selection.player,
      ),
    };
  });

  allBars.summary.textContent = showAllSummary(selection, filterType, seasonName());
  renderAllBars(
    allBars.container,
    sortBars(bars, {
      sortBy: allBars.sortBy.value,
      order: allBars.sortOrder.textContent,
      completionOnly,
    }),
    { completionFirst: completionOnly },
  );
  allBars.section.hidden = false;
}

function setActiveShowAll(filterType) {
  activeShowAll = filterType;

  for (const [type, control] of Object.entries(controls)) {
    control.showAll.classList.toggle("active", type === filterType);
  }

  if (filterType) renderShowAll(filterType);
  else allBars.section.hidden = true;
}

function refreshShowAll() {
  if (activeShowAll) renderShowAll(activeShowAll);
}

function setFilterMode(mode) {
  if (filterMode === mode) return;
  filterMode = mode;
  updateDashboard();
}

function wireEvents() {
  controls.player.select.addEventListener("change", () => {
    // Jump the tier dropdown to where this player mostly plays, but stay in the current mode
    const playerTier = mostCommonTierForPlayer(rows, controls.player.select.value);
    if (playerTier) controls.tier.select.value = playerTier;
    updateDashboard();
  });

  controls.tier.select.addEventListener("change", () => {
    setFilterMode("tier");
    updateDashboard();
  });

  controls.player.switchBtn.addEventListener("click", () => setFilterMode("player"));
  controls.tier.switchBtn.addEventListener("click", () => setFilterMode("tier"));

  controls.game.select.addEventListener("change", () => {
    updateDashboard();
    refreshShowAll();
  });

  averagePanel.modeSelect.addEventListener("change", updateDashboard);

  for (const [type, control] of Object.entries(controls)) {
    control.showAll.addEventListener("click", () => {
      setActiveShowAll(activeShowAll === type ? null : type);
    });
  }

  allBars.completionOnly.addEventListener("change", refreshShowAll);
  allBars.sortBy.addEventListener("change", refreshShowAll);
  allBars.sortOrder.addEventListener("click", () => {
    const wasAscending = allBars.sortOrder.textContent === "Asc";
    allBars.sortOrder.textContent = wasAscending ? "Desc" : "Asc";
    allBars.sortOrder.classList.toggle("active", wasAscending);
    refreshShowAll();
  });
}

async function main() {
  try {
    setStatus("Connecting to Google Sheets...");
    rows = await loadSeasonRows();

    populateSelectors();
    updateDashboard();
    wireEvents();

    setStatus("Data loaded from Google Sheets.");
  } catch (error) {
    setStatus(`Could not load data from Google Sheets: ${error.message}`, true);
  }
}

main();
