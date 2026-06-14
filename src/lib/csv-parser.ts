/**
 * Minimal CSV parsing utilities shared by import parsers (Trakt, Letterboxd, etc.)
 * Handles quoted fields and CRLF line endings.
 */

export interface ParseResult<T> {
  rows: T[];
  skipped: number;
}

/** Split one CSV line, handling quoted fields that may contain commas. */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else { inQuotes = !inQuotes; }
    } else if (ch === "," && !inQuotes) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
}

/** Parse a CSV string into headers + row arrays. Returns empty on <2 lines. */
export function parseCsv(csv: string): { headers: string[]; rows: string[][] } {
  const lines = csv.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { headers: [], rows: [] };
  const headers = parseCsvLine(lines[0]).map((h) => h.toLowerCase().replace(/\s+/g, "_"));
  const rows = lines.slice(1).map((l) => parseCsvLine(l));
  return { headers, rows };
}

/** Get a field value by column name (case-normalised). Returns "" if missing. */
export function col(headers: string[], row: string[], name: string): string {
  const idx = headers.indexOf(name);
  return idx >= 0 ? (row[idx] ?? "").trim() : "";
}
