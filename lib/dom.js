// Page furniture shared by every dashboard. The filter controls themselves differ per
// page (league pages have a tier row, non-league has a date period row), so each app
// builds its own `controls` map from byId.
export const byId = (id) => document.getElementById(id);

export const summaryText = byId("summaryText");
export const sampleSize = byId("sampleSize");

export const mainBar = {
  byPlayer: byId("barByPlayer"),
  uncompleted: byId("barUncompleted"),
  byOther: byId("barByOther"),
};

export const averagePanel = {
  section: byId("tierAverageSection"),
  title: byId("tierAverageTitle"),
  sample: byId("tierAverageSample"),
  modeSelect: byId("averageModeSelect"),
  bar: {
    byPlayer: byId("tierAvgBarByPlayer"),
    uncompleted: byId("tierAvgBarUncompleted"),
    byOther: byId("tierAvgBarByOther"),
  },
};

export const allBars = {
  section: byId("allBarsSection"),
  container: byId("allBarsContainer"),
  summary: byId("allBarsSummaryText"),
  sortBy: byId("sortBySelect"),
  sortOrder: byId("sortOrderBtn"),
  completionOnly: byId("showCompletionOnly"),
};

const statusEl = byId("status");

export function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

// Values are plain strings, or { value, label } pairs when the two differ
export function fillSelect(select, values, selected) {
  select.replaceChildren(
    ...values.map((entry) =>
      typeof entry === "string" ? new Option(entry, entry) : new Option(entry.label, entry.value),
    ),
  );
  select.value = selected;
}
