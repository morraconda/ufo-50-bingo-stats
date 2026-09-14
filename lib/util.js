export function normalize(value) {
  return (value || "").trim().toLowerCase();
}

export function isAll(value) {
  return normalize(value) === "all";
}

export function percent(numerator, denominator) {
  if (denominator === 0) return 0;
  return (numerator / denominator) * 100;
}
