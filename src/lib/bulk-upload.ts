import * as XLSX from "xlsx";

export type BulkUploadResult = {
  created: number;
  updated: number;
  skipped: string[];
};

export function summarizeBulkUpload(result: BulkUploadResult): { error?: string; success?: string } {
  const { created, updated, skipped } = result;
  if (created === 0 && updated === 0) {
    return {
      error: skipped.length ? `No rows were saved. ${skipped.slice(0, 5).join(" · ")}` : "The file has no data rows.",
    };
  }
  const parts = [`${created} added`, `${updated} updated`].filter((p) => !p.startsWith("0 "));
  let success = `Upload complete: ${parts.join(", ")}.`;
  if (skipped.length > 0) {
    success += ` ${skipped.length} row(s) skipped — ${skipped.slice(0, 5).join(" · ")}${skipped.length > 5 ? "…" : ""}`;
  }
  return { success };
}

/** Parses an uploaded .csv/.xlsx file into row objects keyed by header, all values trimmed to strings. */
export function parseSpreadsheet(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "", raw: false });
  return rows.map((row) => {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(row)) {
      normalized[key.trim()] = String(value ?? "").trim();
    }
    return normalized;
  });
}

export function splitList(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export type TemplateFormat = "csv" | "xlsx";

export function buildTemplateFile(
  headers: string[],
  sampleRows: string[][],
  format: TemplateFormat,
): { blob: Blob; contentType: string } {
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...sampleRows]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Template");

  if (format === "csv") {
    const csv = XLSX.utils.sheet_to_csv(sheet);
    return { blob: new Blob([csv], { type: "text/csv" }), contentType: "text/csv" };
  }
  const buffer: ArrayBuffer = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  return {
    blob: new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }),
    contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}
