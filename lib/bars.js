import { diskImageSrc } from "./games.js";

function setSegmentWidth(element, pct) {
  element.style.width = `${pct}%`;
  element.textContent = pct <= 0 ? "" : `${pct.toFixed(1)}%`;
}

// The two fixed bars in the page markup (selected filter, and the average benchmark)
export function renderStackedBar(bar, stats) {
  setSegmentWidth(bar.byPlayer, stats.pctSelected);
  setSegmentWidth(bar.uncompleted, stats.pctNone);
  setSegmentWidth(bar.byOther, stats.pctOther);
}

function segment(modifier, pct) {
  const element = document.createElement("div");
  element.className = `stacked-segment ${modifier}`;
  setSegmentWidth(element, pct);
  return element;
}

function track(stats, completionFirst) {
  const element = document.createElement("div");
  element.className = "stacked-track";

  const byPlayer = segment("by-player", stats.pctSelected);
  const byOther = segment("by-other", stats.pctOther);
  const uncompleted = segment("uncompleted", stats.pctNone);

  // Completion view puts both completed shares on the left so bars compare by total
  // completion; otherwise the player's own share is framed against the opponent's.
  const order = completionFirst
    ? [byPlayer, byOther, uncompleted]
    : [byPlayer, uncompleted, byOther];

  element.append(...order);
  return element;
}

function emptyTrack() {
  const element = document.createElement("div");
  element.className = "empty-track";
  element.textContent = "No data";
  return element;
}

function barTitle({ diskGame, displayName, truncatedName }) {
  const title = document.createElement("h3");
  title.className = "all-bar-title";

  if (diskGame) {
    const img = document.createElement("img");
    img.src = diskImageSrc(diskGame);
    img.alt = displayName;
    img.title = displayName;
    img.className = "game-icon";
    title.appendChild(img);
  } else {
    title.textContent = truncatedName;
    title.title = displayName;
  }

  return title;
}

function barItem(bar, completionFirst) {
  const item = document.createElement("div");
  item.className = "all-bar-item";

  const goalCount = document.createElement("div");
  goalCount.className = "total-count";
  goalCount.textContent = bar.stats.total;

  item.append(
    goalCount,
    barTitle(bar),
    bar.stats.total > 0 ? track(bar.stats, completionFirst) : emptyTrack(),
  );
  return item;
}

export function renderAllBars(container, bars, { completionFirst }) {
  container.replaceChildren(...bars.map((bar) => barItem(bar, completionFirst)));
}
