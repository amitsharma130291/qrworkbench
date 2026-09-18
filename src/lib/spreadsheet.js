import { parseCSV } from './csv.js';

export function tableToRows(data) {
  const nonempty = data.filter(row => row.some(cell => cell !== null && cell !== undefined && String(cell) !== ''));
  if (!nonempty.length) return { headers: [], rows: [] };
  const headers = Array.from(nonempty[0], value => String(value ?? '').trim());
  if (headers.some(h => !h) || new Set(headers.map(h => h.toLowerCase())).size !== headers.length) {
    throw new Error('Use a unique, nonempty header for each column in the first row.');
  }
  const rows = nonempty.slice(1).map(cells => Object.fromEntries(headers.map((h, i) => [h,
    cells[i] instanceof Date ? cells[i].toISOString().slice(0, 10) : String(cells[i] ?? '')
  ])));
  return { headers, rows };
}

export async function readSpreadsheet(file) {
  if (file.size > 20 * 1024 * 1024) throw new Error('Please use a spreadsheet under 20 MB. Split larger jobs into smaller files.');
  if (/\.csv$/i.test(file.name)) {
    const result = parseCSV(await file.text());
    return [{ name: 'CSV', ...result }];
  }
  if (!/\.xlsx$/i.test(file.name)) throw new Error('Choose a CSV or .xlsx workbook. Save older .xls files as .xlsx first.');
  const { default: readExcelFile } = await import('read-excel-file/browser');
  const sheets = await readExcelFile(file);
  return sheets.map(s => ({ name: s.sheet, data: s.data }));
}

export function sheetRows(sheet) {
  return sheet.data ? tableToRows(sheet.data) : { headers: sheet.headers, rows: sheet.rows };
}

export function populateColumns(select, headers, selected, optional = false) {
  select.replaceChildren();
  if (optional) select.add(new Option('None', ''));
  for (const header of headers) select.add(new Option(header, header, false, header === selected));
  select.disabled = false;
}

export function isWebURL(value) {
  try { const u = new URL(value); return ['https:', 'http:'].includes(u.protocol) && Boolean(u.hostname); }
  catch { return false; }
}
