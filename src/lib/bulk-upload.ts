import * as XLSX from "xlsx";

export type SheetRows = Record<string, string>[];

/** Parses every sheet of an uploaded .xlsx workbook, keyed by sheet name, values trimmed to strings. */
export function parseWorkbookSheets(buffer: ArrayBuffer): Record<string, SheetRows> {
  const workbook = XLSX.read(buffer, { type: "array" });
  const result: Record<string, SheetRows> = {};
  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
    result[sheetName] = rows.map((row) => {
      const normalized: Record<string, string> = {};
      for (const [key, value] of Object.entries(row)) {
        normalized[key.trim()] = String(value ?? "").trim();
      }
      return normalized;
    });
  }
  return result;
}

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export type TemplateSheet = { name: string; headers: string[]; rows: string[][] };

export function buildTemplateWorkbook(sheets: TemplateSheet[]): Blob {
  const workbook = XLSX.utils.book_new();
  for (const sheet of sheets) {
    const ws = XLSX.utils.aoa_to_sheet([sheet.headers, ...sheet.rows]);
    XLSX.utils.book_append_sheet(workbook, ws, sheet.name);
  }
  const buffer: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}

export type BulkUploadSection = { label: string; created: number; updated: number };

/** Builds a combined success/error summary across multiple sheets processed in one upload. */
export function summarizeBulkUpload(sections: BulkUploadSection[], skipped: string[]): { error?: string; success?: string } {
  const totalSaved = sections.reduce((sum, s) => sum + s.created + s.updated, 0);
  if (totalSaved === 0) {
    return {
      error: skipped.length ? `No rows were saved. ${skipped.slice(0, 5).join(" · ")}` : "The file has no data rows.",
    };
  }
  const parts = sections
    .filter((s) => s.created + s.updated > 0)
    .map((s) => {
      const bits = [s.created > 0 ? `${s.created} added` : null, s.updated > 0 ? `${s.updated} updated` : null].filter(
        Boolean,
      );
      return `${s.label}: ${bits.join(", ")}`;
    });
  let success = `Upload complete. ${parts.join(". ")}.`;
  if (skipped.length > 0) {
    success += ` ${skipped.length} row(s) skipped — ${skipped.slice(0, 5).join(" · ")}${skipped.length > 5 ? "…" : ""}`;
  }
  return { success };
}

/**
 * Resolves a referenced record's id: an explicit id wins, else a name is matched
 * case-insensitively against rows created/updated earlier in the same upload, else
 * against the database by exact (case-insensitive) name match.
 */
export async function resolveReferenceId(
  explicitId: string | undefined,
  name: string | undefined,
  localMap: Map<string, string>,
  dbLookup: (name: string) => Promise<{ id: string }[]>,
): Promise<{ id: string } | { error: string }> {
  if (explicitId) return { id: explicitId };
  if (!name) return { error: "no ID or name given to match against" };

  const local = localMap.get(name.toLowerCase());
  if (local) return { id: local };

  const matches = await dbLookup(name);
  if (matches.length === 1) return { id: matches[0].id };
  if (matches.length === 0) return { error: `no match found for "${name}"` };
  return { error: `"${name}" matches more than one record — use its ID column instead` };
}
