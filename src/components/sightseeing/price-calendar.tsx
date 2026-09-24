import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { findRateForDate, getMonthGrid, MONTH_NAMES, DAY_LABELS } from "@/lib/sightseeing";
import { formatCurrency } from "@/lib/format";
import type { SightseeingRate } from "@prisma/client";

export function PriceCalendar({
  sightseeingId,
  rates,
  year,
  month,
}: {
  sightseeingId: string;
  rates: SightseeingRate[];
  year: number;
  month: number;
}) {
  const cells = getMonthGrid(year, month);
  const today = new Date();
  const prev = month === 0 ? { year: year - 1, month: 11 } : { year, month: month - 1 };
  const next = month === 11 ? { year: year + 1, month: 0 } : { year, month: month + 1 };

  function monthHref(y: number, m: number) {
    return `/sightseeing/${sightseeingId}/edit?month=${y}-${String(m + 1).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <Link href={monthHref(prev.year, prev.month)} className="rounded-md p-1.5 hover:bg-muted">
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <p className="text-sm font-semibold text-foreground">
          {MONTH_NAMES[month]} {year}
        </p>
        <Link href={monthHref(next.year, next.month)} className="rounded-md p-1.5 hover:bg-muted">
          <ChevronRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
        {DAY_LABELS.map((d) => (
          <div key={d.code}>{d.label}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((date, i) => {
          if (!date) return <div key={i} />;
          const rate = findRateForDate(rates, date);
          const isToday = date.toDateString() === today.toDateString();
          return (
            <div
              key={i}
              className={cn(
                "flex flex-col items-center gap-0.5 rounded-md border border-border p-1.5",
                isToday && "border-primary",
              )}
            >
              <span className="text-xs text-foreground">{date.getDate()}</span>
              {rate ? (
                <>
                  {rate.adultRate != null ? (
                    <span className="text-[10px] font-semibold text-primary">A {formatCurrency(rate.adultRate)}</span>
                  ) : null}
                  {rate.childRate != null ? (
                    <span className="text-[10px] font-semibold text-sky-600 dark:text-sky-400">
                      C {formatCurrency(rate.childRate)}
                    </span>
                  ) : null}
                  {rate.infantRate != null ? (
                    <span className="text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                      I {formatCurrency(rate.infantRate)}
                    </span>
                  ) : null}
                  {rate.adultRate == null && rate.childRate == null && rate.infantRate == null ? (
                    <span className="text-[10px] text-muted-foreground">—</span>
                  ) : null}
                </>
              ) : (
                <span className="text-[10px] text-muted-foreground">—</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
