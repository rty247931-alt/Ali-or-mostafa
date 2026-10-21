// CSV with spreadsheet-formula injection protection (a cell starting with = + - @ would execute in Excel).
export function csvCell(v: unknown): string {
  if (v == null) return "";
  let s = v instanceof Date ? v.toISOString() : String(v);
  if (typeof v !== "number" && /^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** BOM so Excel opens Arabic text correctly. */
export const toCsv = (rows: unknown[][]): string => "\uFEFF" + rows.map((r) => r.map(csvCell).join(",")).join("\r\n");

export function parseCsv(text: string): string[][] {
  const t = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [], cell = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((x) => x.trim() !== "")) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some((x) => x.trim() !== "")) rows.push(row);
  return rows;
}
