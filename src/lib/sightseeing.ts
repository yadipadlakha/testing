import type { SightseeingRate } from "@prisma/client";

export const DAY_LABELS: { code: string; label: string }[] = [
  { code: "SUN", label: "Sun" },
  { code: "MON", label: "Mon" },
  { code: "TUE", label: "Tue" },
  { code: "WED", label: "Wed" },
  { code: "THU", label: "Thu" },
  { code: "FRI", label: "Fri" },
  { code: "SAT", label: "Sat" },
];

const DAY_CODES = DAY_LABELS.map((d) => d.code);

export function findRateForDate(rates: SightseeingRate[], date: Date) {
  const code = DAY_CODES[date.getDay()];
  return rates.find((rate) => date >= rate.startDate && date <= rate.endDate && rate.daysOfWeek.includes(code));
}

export function getMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
