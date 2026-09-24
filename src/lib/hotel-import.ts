import * as XLSX from "xlsx";

export type ParsedSeason = { name: string; startDate: Date; endDate: Date };
export type ParsedRoomRate = { roomCategory: string; roomType: string; mealPlan: string; pax: string; seasonName: string; rate: number };
export type ParsedExtraRate = { label: string; seasonName: string; rate: number };
export type ParsedHotelProperty = {
  name: string;
  country: string;
  starRating: number | null;
  seasons: ParsedSeason[];
  roomRates: ParsedRoomRate[];
  extraRates: ParsedExtraRate[];
};

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

function parseDate(text: string): Date | null {
  const match = text.trim().match(/^(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})$/);
  if (!match) return null;
  const [, day, monthName, year] = match;
  const month = MONTHS[monthName.slice(0, 3).toLowerCase()];
  if (month === undefined) return null;
  return new Date(Date.UTC(Number(year), month, Number(day)));
}

function isPropertyHeaderRow(cell: string): boolean {
  return cell.split("|").length === 3;
}

function isBlankRow(row: string[]): boolean {
  return !row.some((cell) => cell.trim() !== "");
}

/** Parses a hotel rate-sheet CSV (property header, season table, room-rate matrix, extras) into one or more properties. */
export function parseHotelImportCsv(buffer: ArrayBuffer): ParsedHotelProperty[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return [];
  const rows: string[][] = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], {
    header: 1,
    raw: false,
    defval: "",
  });

  const properties: ParsedHotelProperty[] = [];
  let i = 0;

  while (i < rows.length) {
    const row = rows[i] ?? [];
    const firstCell = (row[0] ?? "").trim();

    if (!isPropertyHeaderRow(firstCell)) {
      i++;
      continue;
    }

    const [rawName, rawCountry, rawStar] = firstCell.split("|").map((s) => s.trim());
    const starMatch = rawStar?.match(/\d+/);
    i++;

    if ((rows[i]?.[0] ?? "").trim().toUpperCase() === "SEASON REFERENCE") i++;

    const seasons: ParsedSeason[] = [];
    while (i < rows.length && !isBlankRow(rows[i]) && !isPropertyHeaderRow((rows[i][0] ?? "").trim())) {
      const seasonName = (rows[i][0] ?? "").trim();
      const dateRange = (rows[i][1] ?? "").trim();
      const [startText, endText] = dateRange.split("-").map((s) => s.trim());
      const startDate = startText ? parseDate(startText) : null;
      const endDate = endText ? parseDate(endText) : null;
      if (seasonName && startDate && endDate) seasons.push({ name: seasonName, startDate, endDate });
      i++;
    }
    while (i < rows.length && isBlankRow(rows[i])) i++;

    const headerRow = rows[i] ?? [];
    const seasonColumns = headerRow.slice(4).map((c) => c.trim());
    i++;

    const roomRates: ParsedRoomRate[] = [];
    const extraRates: ParsedExtraRate[] = [];
    let inExtras = false;

    while (i < rows.length) {
      const dataRow = rows[i] ?? [];
      const cell0 = (dataRow[0] ?? "").trim();

      if (isPropertyHeaderRow(cell0)) break;
      if (isBlankRow(dataRow)) {
        i++;
        continue;
      }
      if (cell0.toUpperCase() === "EXTRAS") {
        inExtras = true;
        i++;
        continue;
      }

      if (inExtras) {
        const label = cell0;
        const values = dataRow.slice(4);
        for (let c = 0; c < seasonColumns.length; c++) {
          const raw = (values[c] ?? "").trim();
          if (raw === "" || Number.isNaN(Number(raw))) continue;
          extraRates.push({ label, seasonName: seasonColumns[c], rate: Number(raw) });
        }
      } else {
        const roomCategory = cell0;
        const roomType = (dataRow[1] ?? "").trim();
        const mealPlan = (dataRow[2] ?? "").trim();
        const pax = (dataRow[3] ?? "").trim();
        const values = dataRow.slice(4);
        for (let c = 0; c < seasonColumns.length; c++) {
          const raw = (values[c] ?? "").trim();
          if (raw === "" || Number.isNaN(Number(raw))) continue;
          roomRates.push({ roomCategory, roomType, mealPlan, pax, seasonName: seasonColumns[c], rate: Number(raw) });
        }
      }
      i++;
    }

    properties.push({
      name: rawName ?? "",
      country: rawCountry ?? "",
      starRating: starMatch ? Number(starMatch[0]) : null,
      seasons,
      roomRates,
      extraRates,
    });
  }

  return properties;
}
