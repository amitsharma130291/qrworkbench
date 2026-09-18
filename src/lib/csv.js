export function parseCSV(text) {
  const records = [];
  let record = [];
  let cur = "";
  let inQuotes = false;
  text = text.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      record.push(cur);
      cur = "";
    } else if (ch === '\n' || ch === '\r') {
      record.push(cur); records.push(record); record = []; cur = '';
      if (ch === '\r' && text[i + 1] === '\n') i++;
    } else {
      cur += ch;
    }
  }
  if (inQuotes) throw new Error('CSV has an unclosed quoted field. Export it again from your spreadsheet.');
  record.push(cur); records.push(record);
  const nonempty = records.filter(row => row.some(value => value !== ''));
  if (!nonempty.length) return { headers: [], rows: [] };
  const headers = nonempty[0].map(h => h.trim());
  if (headers.some(h => !h) || new Set(headers.map(h => h.toLowerCase())).size !== headers.length) throw new Error('Use unique, nonempty column headers.');
  const rows = nonempty.slice(1).map(cells => Object.fromEntries(headers.map((h, i) => [h, cells[i] ?? ''])));
  return { headers, rows };
}

export function guessColumn(headers, keywords, fallback = null) {
  const lower = headers.map((h) => h.toLowerCase());
  for (const kw of keywords) {
    const idx = lower.findIndex((h) => h.includes(kw));
    if (idx !== -1) return headers[idx];
  }
  return fallback;
}

export function sanitizeFilename(value) {
  return String(value || "untitled").trim().replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "") || "untitled";
}

export function buildFilename(pattern, row, headers) {
  const filled = pattern.replace(/\{([^}]+)\}/g, (_, col) => {
    const key = headers.find((h) => h.toLowerCase() === col.toLowerCase());
    return sanitizeFilename(key ? row[key] : col);
  });
  return filled || "code";
}
