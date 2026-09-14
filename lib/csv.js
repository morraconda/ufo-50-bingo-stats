// Minimal CSV reader for Google Sheets exports: handles quoted fields, escaped quotes
// inside them, and both line-ending styles.
export function parseCsv(text) {
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
      if (char === "\r" && next === "\n") i += 1;
      current.push(field);
      field = "";
      if (current.length > 1 || current[0] !== "") lines.push(current);
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

// Sheet columns are matched loosely so a renamed header ("Completed by" vs "Completed By")
// doesn't break the import.
export function columnFinder(headers) {
  return (needle) => headers.findIndex((header) => header.toLowerCase().includes(needle));
}

export async function fetchSheetCsv(spreadsheetId, gid = 0) {
  const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return parseCsv(await response.text());
}
