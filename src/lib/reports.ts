import { prisma } from "@/lib/prisma";

// Statuses that count as a converted lead.
const CONVERTED = ["CONVERTED", "ON_TRIP", "PAST_TRIP"];
// Quote statuses that count toward revenue (issued / booked).
const REVENUE_STATUSES = ["sent", "confirmed"];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export interface Kpis {
  revenue: number;
  currency: string;
  leads: number;
  quotes: number;
  conversions: number;
}

export interface TripRow {
  id: string;
  ref: string;
  guest: string;
  basic: string; // "Hong Kong • B2B • 14 Aug • 6N"
  salesPerson: string;
  date: string;
  amount: number;
  status: string;
}

export interface TeamRow {
  name: string;
  leads: number;
  quotes: number;
  conversions: number;
  convPct: number;
  drops: number;
  pax: number;
  revenue: number;
}

export interface GroupRow {
  name: string;
  leads: number;
  quotes: number;
  conversions: number;
  convPct: number;
  pax: number;
  revenue: number;
}

export interface ReportData {
  monthLabel: string;
  monthKey: string; // YYYY-MM
  prevKey: string;
  nextKey: string;
  currency: string;
  kpis: Kpis;
  trips: TripRow[];
  team: TeamRow[];
  destinations: GroupRow[];
  sources: GroupRow[];
}

export function parseMonth(monthStr?: string): { y: number; m: number } {
  if (monthStr && /^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split("-").map(Number);
    return { y, m: m - 1 };
  }
  const now = new Date();
  return { y: now.getUTCFullYear(), m: now.getUTCMonth() };
}

function key(y: number, m: number): string {
  return `${y}-${String(m + 1).padStart(2, "0")}`;
}

function shortDate(d: Date): string {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

export async function getReport(monthStr?: string): Promise<ReportData> {
  const { y, m } = parseMonth(monthStr);
  const start = new Date(Date.UTC(y, m, 1));
  const end = new Date(Date.UTC(y, m + 1, 1));

  const [queries, quotes] = await Promise.all([
    prisma.query.findMany({ where: { createdAt: { gte: start, lt: end } } }),
    prisma.quote.findMany({
      where: { createdAt: { gte: start, lt: end } },
      include: {
        query: {
          select: { guestName: true, salutation: true, salesTeam: true, source: true },
        },
      },
    }),
  ]);

  const currency = quotes[0]?.currency || "HKD";
  const money = (q: (typeof quotes)[number]) => Number(q.total);

  // ---- KPIs ----
  const conversions = queries.filter((q) => CONVERTED.includes(q.status)).length;
  const revenue = quotes
    .filter((q) => REVENUE_STATUSES.includes(q.status))
    .reduce((s, q) => s + money(q), 0);

  const kpis: Kpis = {
    revenue,
    currency,
    leads: queries.length,
    quotes: quotes.length,
    conversions,
  };

  // ---- Trips (one row per quote) ----
  const nights = (a: Date, b: Date) =>
    Math.max(1, Math.round((+new Date(b) - +new Date(a)) / 86400000));
  const trips: TripRow[] = quotes.map((q) => ({
    id: q.id,
    ref: `QT-${q.id.slice(-6).toUpperCase()}`,
    guest: q.query
      ? `${q.query.salutation ? q.query.salutation + " " : ""}${q.query.guestName}`
      : "N/A",
    basic: [
      q.city,
      q.query?.source || "—",
      shortDate(q.checkIn),
      `${nights(q.checkIn, q.checkOut)}N`,
    ].join(" • "),
    salesPerson: q.query?.salesTeam || "Unassigned",
    date: shortDate(q.createdAt),
    amount: money(q),
    status: q.status,
  }));

  // ---- Sales Team ----
  const teamMap = new Map<string, TeamRow>();
  const teamOf = (name?: string | null) => {
    const key = name || "Unassigned";
    if (!teamMap.has(key))
      teamMap.set(key, {
        name: key, leads: 0, quotes: 0, conversions: 0, convPct: 0, drops: 0, pax: 0, revenue: 0,
      });
    return teamMap.get(key)!;
  };
  for (const q of queries) {
    const t = teamOf(q.salesTeam);
    t.leads++;
    t.pax += q.adults + q.childAges.length;
    if (CONVERTED.includes(q.status)) t.conversions++;
    if (q.status === "DROPPED") t.drops++;
  }
  for (const q of quotes) {
    const t = teamOf(q.query?.salesTeam);
    t.quotes++;
    if (REVENUE_STATUSES.includes(q.status)) t.revenue += money(q);
  }

  // ---- Destinations (by each destination on a query; quote revenue to primary) ----
  const destMap = new Map<string, GroupRow>();
  const srcMap = new Map<string, GroupRow>();
  const grp = (map: Map<string, GroupRow>, name: string) => {
    if (!map.has(name))
      map.set(name, { name, leads: 0, quotes: 0, conversions: 0, convPct: 0, pax: 0, revenue: 0 });
    return map.get(name)!;
  };

  for (const q of queries) {
    const converted = CONVERTED.includes(q.status);
    const pax = q.adults + q.childAges.length;
    const dests = q.destinations.length ? q.destinations : ["Unspecified"];
    for (const d of dests) {
      const g = grp(destMap, d);
      g.leads++;
      g.pax += pax;
      if (converted) g.conversions++;
    }
    const g = grp(srcMap, q.source || "Unknown");
    g.leads++;
    g.pax += pax;
    if (converted) g.conversions++;
  }
  for (const q of quotes) {
    const primary = q.city.split(/[&,]/)[0].trim() || q.city;
    const g = grp(destMap, primary);
    g.quotes++;
    if (REVENUE_STATUSES.includes(q.status)) g.revenue += money(q);
    const s = grp(srcMap, q.query?.source || "Unknown");
    s.quotes++;
    if (REVENUE_STATUSES.includes(q.status)) s.revenue += money(q);
  }

  const finalize = <T extends { leads: number; conversions: number; convPct: number; revenue: number }>(
    rows: T[],
  ) => {
    for (const r of rows) r.convPct = r.leads ? (r.conversions / r.leads) * 100 : 0;
    return rows.sort((a, b) => b.revenue - a.revenue || b.leads - a.leads);
  };

  return {
    monthLabel: `${MONTHS[m]} ${y}`,
    monthKey: key(y, m),
    prevKey: key(m === 0 ? y - 1 : y, m === 0 ? 11 : m - 1),
    nextKey: key(m === 11 ? y + 1 : y, m === 11 ? 0 : m + 1),
    currency,
    kpis,
    trips,
    team: finalize(Array.from(teamMap.values()).map((t) => ({ ...t, convPct: t.leads ? (t.conversions / t.leads) * 100 : 0 }))) as TeamRow[],
    destinations: finalize(Array.from(destMap.values())),
    sources: finalize(Array.from(srcMap.values())),
  };
}
