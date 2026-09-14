import { isAll } from "../lib/util.js";

// Tier names differ by season (A/B/C, A/B1/B2/C1/C2, A1/A2/B1/B2/C1/C2), so order them
// naturally instead of from a fixed list: "All" first, then letter, then trailing number.
export function compareTiers(a, b) {
  if (isAll(a)) return isAll(b) ? 0 : -1;
  if (isAll(b)) return 1;
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export function sortShowAllValues(values, filterType) {
  return [...values].sort((a, b) => {
    if (filterType === "tier") return compareTiers(a, b);
    if (filterType === "game") {
      if (a === "All") return -1;
      if (b === "All") return 1;
    }
    return a.localeCompare(b);
  });
}
