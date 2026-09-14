// A period is a window of time starting at a chosen date. "To present" runs from that
// date to the end of the data; the fixed lengths are counted in months.
export const PERIOD_OPTIONS = [
  { value: "1", label: "1 month", months: 1 },
  { value: "3", label: "3 months", months: 3 },
  { value: "6", label: "6 months", months: 6 },
  { value: "12", label: "1 year", months: 12 },
  { value: "present", label: "To present", months: null },
];

export const DEFAULT_PERIOD = "present";

export function periodLabel(value) {
  return PERIOD_OPTIONS.find((option) => option.value === value)?.label ?? value;
}

function monthsIn(value) {
  return PERIOD_OPTIONS.find((option) => option.value === value)?.months ?? null;
}

// Sheet dates are M/D/YYYY. Parsed as local midnight so comparisons line up with the
// date input, which also yields local dates.
export function parseSheetDate(text) {
  const parts = (text || "").trim().split("/");
  if (parts.length !== 3) return null;

  const [month, day, year] = parts.map(Number);
  if (!month || !day || !year) return null;

  const date = new Date(year, month - 1, day);
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

// yyyy-mm-dd, the format <input type="date"> expects
export function toInputValue(timestamp) {
  const date = new Date(timestamp);
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromInputValue(value) {
  const [year, month, day] = (value || "").split("-").map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day).getTime();
}

export function formatDate(timestamp) {
  return new Date(timestamp).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function addMonths(timestamp, months) {
  const date = new Date(timestamp);
  const day = date.getDate();
  date.setMonth(date.getMonth() + months);
  // Clamp a rolled-over short month (Jan 31 + 1 month) back to that month's last day
  if (date.getDate() < day) date.setDate(0);
  return date.getTime();
}

// The window a selection covers. `end` is null for "to present", meaning open-ended.
export function periodWindow({ start, period }) {
  const months = monthsIn(period);
  return { start, end: months === null ? null : addMonths(start, months) };
}

export function withinWindow(timestamp, { start, end }) {
  if (timestamp < start) return false;
  return end === null || timestamp < end;
}

// Short enough for a bar's label column; the full range goes in the tooltip
export function periodBarLabel({ start, end }) {
  const monthYear = new Date(start).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
  return end === null ? `From ${monthYear}` : monthYear;
}

export function describeWindow({ start, end }) {
  return end === null
    ? `${formatDate(start)} to present`
    : `${formatDate(start)} – ${formatDate(end - 1)}`;
}

// Consecutive windows of the chosen length, tiled forward from the start date until the
// data runs out. "To present" is a single open-ended window.
export function tileWindows({ start, period }, lastTimestamp) {
  const months = monthsIn(period);
  if (months === null) return [{ start, end: null }];

  const windows = [];
  let cursor = start;
  while (cursor <= lastTimestamp && windows.length < 200) {
    const end = addMonths(cursor, months);
    windows.push({ start: cursor, end });
    cursor = end;
  }
  return windows.length ? windows : [{ start, end: addMonths(start, months) }];
}
