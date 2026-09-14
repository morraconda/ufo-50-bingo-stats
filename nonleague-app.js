import { renderAllBars, renderStackedBar } from "./lib/bars.js";
import { allBars, averagePanel, byId, fillSelect, mainBar, sampleSize, setStatus, summaryText } from "./lib/dom.js";
import { sortBars, sortGameOptions } from "./lib/sorting.js";
import { computeOutcomeStats } from "./lib/stats.js";
import { isAll } from "./lib/util.js";
import {
  dataDateRange,
  firstCompletedDate,
  matchesGame,
  playedIn,
  selectRows,
  selectorOptions,
  showAllValues,
} from "./nonleague/filters.js";
import {
  averagePanelText,
  filterSummary,
  sampleSizeText,
  showAllSummary,
  truncateLabel,
} from "./nonleague/labels.js";
import {
  DEFAULT_PERIOD,
  PERIOD_OPTIONS,
  describeWindow,
  fromInputValue,
  periodBarLabel,
  periodWindow,
  tileWindows,
  toInputValue,
  withinWindow,
} from "./nonleague/period.js";
import { loadNonLeagueRows } from "./nonleague/sheet.js";

const controls = {
  player: {
    select: byId("playerSelect"),
    switchBtn: byId("playerSwitchBtn"),
    showAll: byId("playerShowAll"),
  },
  period: {
    startInput: byId("startDateInput"),
    select: byId("periodSelect"),
    switchBtn: byId("periodSwitchBtn"),
    showAll: byId("periodShowAll"),
  },
  game: {
    select: byId("gameSelect"),
    showAll: byId("gameShowAll"),
  },
};

let rows = [];
let dateRange = { first: 0, last: 0 };
let filterMode = "period";
let activeShowAll = null;

function currentSelection() {
  return {
    mode: filterMode,
    player: controls.player.select.value,
    game: controls.game.select.value,
  };
}

function currentWindow() {
  return periodWindow({
    start: fromInputValue(controls.period.startInput.value) ?? dateRange.first,
    period: controls.period.select.value,
  });
}

function populateSelectors() {
  const { players, games } = selectorOptions(rows);
  const sortedPlayers = [...players].sort((a, b) => a.localeCompare(b));

  fillSelect(controls.player.select, sortedPlayers, sortedPlayers[0] || "");
  fillSelect(controls.game.select, ["All", ...sortGameOptions(games)], "All");
  fillSelect(controls.period.select, PERIOD_OPTIONS, DEFAULT_PERIOD);

  dateRange = dataDateRange(rows);
  const start = firstCompletedDate(rows) ?? dateRange.first;
  controls.period.startInput.value = toInputValue(start);
  controls.period.startInput.min = toInputValue(dateRange.first);
  controls.period.startInput.max = toInputValue(dateRange.last);
}

function applyFilterModeUi(selection, window) {
  const usingPlayer = selection.mode === "player";

  controls.player.select.classList.toggle("active-mode", usingPlayer);
  controls.period.select.classList.toggle("active-mode", !usingPlayer);
  setSwitchButton(controls.player.switchBtn, usingPlayer);
  setSwitchButton(controls.period.switchBtn, !usingPlayer);

  summaryText.textContent = filterSummary(selection, window);
}

function setSwitchButton(button, isDriving) {
  button.textContent = isDriving ? "Selected" : "";
  button.classList.toggle("active", isDriving);
}

function renderAveragePanel(selection, window) {
  const averageMode = averagePanel.modeSelect.value;

  const averageRows =
    averageMode === "game"
      // Across every game, holding the period (and the player, in player mode) fixed
      ? rows.filter(
          (row) =>
            withinWindow(row.date, window) &&
            (selection.mode !== "player" || playedIn(row, selection.player)),
        )
      // Across everyone in the period, holding the game fixed
      : rows.filter((row) => withinWindow(row.date, window) && matchesGame(row, selection.game));

  const { title, sample } = averagePanelText(selection, window, averageMode, averageRows.length);

  renderStackedBar(averagePanel.bar, computeOutcomeStats(averageRows, "period", selection.player));
  averagePanel.title.textContent = title;
  averagePanel.sample.textContent = sample;
  averagePanel.section.hidden = false;
}

function updateDashboard() {
  const selection = currentSelection();
  const window = currentWindow();
  const stats = computeOutcomeStats(
    selectRows(rows, selection, window),
    selection.mode,
    selection.player,
  );

  renderStackedBar(mainBar, stats);
  sampleSize.textContent = sampleSizeText(stats, selection, window);
  renderAveragePanel(selection, window);
  applyFilterModeUi(selection, window);
}

// Period bars enumerate consecutive windows of the chosen length; the other axes
// enumerate their values within the single selected window.
function periodBars(selection) {
  const start = fromInputValue(controls.period.startInput.value) ?? dateRange.first;
  return tileWindows({ start, period: controls.period.select.value }, dateRange.last).map(
    (window) => {
      return {
        // The bar shows a compact month; the full range shows on hover
        displayName: describeWindow(window),
        truncatedName: periodBarLabel(window),
        sortValue: window.start,
        diskGame: null,
        stats: computeOutcomeStats(
          selectRows(rows, selection, window),
          selection.mode,
          selection.player,
        ),
      };
    },
  );
}

function valueBars(selection, window, filterType) {
  return showAllValues(rows, filterType).map((value) => {
    const barSelection =
      filterType === "game"
        ? { ...selection, game: value }
        : { ...selection, mode: "player", player: value };

    return {
      displayName: value,
      truncatedName: truncateLabel(value),
      // Game bars show the disk art instead of a label, except the "All" row
      diskGame: filterType === "game" && !isAll(value) ? value : null,
      stats: computeOutcomeStats(
        selectRows(rows, barSelection, window),
        barSelection.mode,
        barSelection.player,
      ),
    };
  });
}

function renderShowAll(filterType) {
  const selection = currentSelection();
  const window = currentWindow();
  const completionOnly = allBars.completionOnly.checked;

  const bars =
    filterType === "period" ? periodBars(selection) : valueBars(selection, window, filterType);

  allBars.summary.textContent = showAllSummary(selection, window, filterType);
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
  refreshShowAll();
}

function wireEvents() {
  controls.player.select.addEventListener("change", () => {
    updateDashboard();
  });

  for (const element of [controls.period.startInput, controls.period.select]) {
    element.addEventListener("change", () => {
      // Narrowing the window is a period question, so let it drive
      setFilterMode("period");
      updateDashboard();
      refreshShowAll();
    });
  }

  controls.player.switchBtn.addEventListener("click", () => setFilterMode("player"));
  controls.period.switchBtn.addEventListener("click", () => setFilterMode("period"));

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
    rows = await loadNonLeagueRows();

    populateSelectors();
    updateDashboard();
    wireEvents();

    setStatus(`Data loaded from Google Sheets: ${rows.length} goals across ${new Set(rows.map((row) => row.match)).size} cards.`);
  } catch (error) {
    setStatus(`Could not load data from Google Sheets: ${error.message}`, true);
  }
}

main();
