const CSV_PATH = "../UFO 50 Bingo S3 stats - Data.csv";

const statusEl = document.getElementById("graphStatus");
const svg = document.getElementById("scatterSvg");

// Mapping from map.txt to associate names with image filenames
const gameToId = {
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
  return (value || "").trim();
}

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.classList.toggle("error", isError);
}

function aggregateByGame(records, headers) {
  const idx = {
    completedBy: headers.indexOf("Completed by"),
    game: headers.indexOf("Game"),
    order: headers.indexOf("Order"),
  };

  const stats = new Map();

  for (const record of records) {
    const game = normalize(record[idx.game]);
    if (!game) continue;

    let row = stats.get(game);
    if (!row) {
      row = { game, total: 0, completed: 0, orderSum: 0, orderCount: 0 };
      stats.set(game, row);
    }

    row.total += 1;
    if (normalize(record[idx.completedBy])) {
      row.completed += 1;
    }

    const orderRaw = normalize(record[idx.order]);
    if (orderRaw !== "") {
      const orderNum = Number(orderRaw);
      if (!Number.isNaN(orderNum)) {
        row.orderSum += orderNum;
        row.orderCount += 1;
      }
    }
  }

  return [...stats.values()].map((row) => {
    const completionPct = row.total === 0 ? 0 : (row.completed / row.total) * 100;
    const avgOrder =
      row.orderCount === 0 ? null : row.orderSum / row.orderCount;
    return {
      game: row.game,
      total: row.total,
      completed: row.completed,
      completionPct,
      avgOrder,
    };
  });
}

function renderScatter(points) {
  // Increased dimensions for disk visibility
  const margin = { top: 60, right: 60, bottom: 80, left: 80 };
  const width = 1600;
  const height = 900;
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  const xMin = 55;
  const xMax = 90;
  const yMin = 6;
  const yMax = 14;

  const xScale = (x) => margin.left + ((x - xMin) / (xMax - xMin)) * plotW;
  const yScale = (y) => margin.top + plotH - ((y - yMin) / (yMax - yMin)) * plotH;

  const xTicks = [55, 60, 65, 70, 75, 80, 85, 90];
  const yTicks = [6, 7, 8, 9, 10, 11, 12, 13, 14];

  const ns = "http://www.w3.org/2000/svg";
  const g = document.createElementNS(ns, "g");

  function el(name, attrs = {}) {
    const node = document.createElementNS(ns, name);
    for (const [k, v] of Object.entries(attrs)) {
      if (k === "href") {
        node.setAttributeNS("http://www.w3.org/1999/xlink", "href", v);
      } else {
        node.setAttribute(k, String(v));
      }
    }
    return node;
  }

  // Grid lines
  for (const xv of xTicks) {
    const gx = xScale(xv);
    g.appendChild(
      el("line", {
        class: "grid-line",
        x1: gx, x2: gx,
        y1: margin.top, y2: margin.top + plotH,
      }),
    );
  }

  for (const yv of yTicks) {
    const gy = yScale(yv);
    g.appendChild(
      el("line", {
        class: "grid-line",
        x1: margin.left, x2: margin.left + plotW,
        y1: gy, y2: gy,
      }),
    );
  }

  // Axes
  g.appendChild(el("line", { class: "axis-line", x1: margin.left, x2: margin.left + plotW, y1: margin.top + plotH, y2: margin.top + plotH }));
  g.appendChild(el("line", { class: "axis-line", x1: margin.left, x2: margin.left, y1: margin.top, y2: margin.top + plotH }));

  // Labels
  for (const xv of xTicks) {
    const x = xScale(xv);
    const label = el("text", { class: "axis-label", x, y: margin.top + plotH + 25, "text-anchor": "middle" });
    label.textContent = `${xv}%`;
    g.appendChild(label);
  }

  for (const yv of yTicks) {
    const y = yScale(yv);
    const label = el("text", { class: "axis-label", x: margin.left - 12, y: y + 5, "text-anchor": "end" });
    label.textContent = String(yv);
    g.appendChild(label);
  }

  const pointsGroup = el("g", { class: "points-layer" });
  const labelsGroup = el("g", { class: "labels-layer" });

  for (const p of points) {
    if (p.avgOrder === null) continue;
    console.log(p.game, p.completionPct, p.avgOrder);
    const cx = xScale(Math.min(xMax, Math.max(xMin, p.completionPct)));
    const plotY = Math.min(yMax, Math.max(yMin, p.avgOrder));
    const cy = yScale(plotY);

    // Small dot for exact coordinate
    const circle = el("circle", { class: "point", cx, cy, r: 3 });
    pointsGroup.appendChild(circle);

    // Disk Image
    const gameId = gameToId[p.game];
    if (gameId) {
      const imgSize = 44;
      const diskImg = el("image", {
        href: `disks/${gameId}.png`,
        x: cx - imgSize / 2,
        y: cy - imgSize / 2,
        width: imgSize,
        height: imgSize,
        class: "game-disk"
      });
      
      const title = document.createElementNS(ns, "title");
      title.textContent = `${p.game}: ${p.completionPct.toFixed(1)}% complete, avg order ${p.avgOrder.toFixed(2)}`;
      diskImg.appendChild(title);
      labelsGroup.appendChild(diskImg);
    }
  }

  g.appendChild(pointsGroup);
  g.appendChild(labelsGroup);

  svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
  const existing = svg.querySelectorAll(":scope > g");
  for (const node of existing) node.remove();
  svg.appendChild(g);
}

async function main() {
  try {
    const response = await fetch(CSV_PATH);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csvText = await response.text();
    const table = parseCsv(csvText);
    const headers = table[0];
    const records = table.slice(1);
    const points = aggregateByGame(records, headers).sort((a, b) => a.game.localeCompare(b.game));

    renderScatter(points);
    setStatus(`Plotted ${points.length} games.`);
  } catch (error) {
    setStatus(`Could not load CSV data: ${error.message}`, true);
  }
}

main();