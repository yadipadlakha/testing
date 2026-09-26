import { ChevronDown, Route } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/enquiry";
import type { DayPlan } from "@/lib/itinerary";

export function TourOverview({ days }: { days: DayPlan[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Route className="h-4 w-4 text-muted-foreground" />
        <CardTitle>Tour Overview</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2 px-0">
        {days.map((day) => (
          <details key={day.dayNumber} className="group border-t border-border px-6 py-3 first:border-t-0">
            <summary className="flex cursor-pointer list-none items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                  Day {day.dayNumber}
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{day.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(day.date)}</p>
                </div>
              </div>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-150 group-open:rotate-180" />
            </summary>

            <div className="mt-3 flex flex-col gap-2 pl-1">
              {day.hotel || day.transfers.length > 0 || day.activities.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {day.hotel ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-primary/5 px-3 py-1 text-xs font-medium text-foreground">
                      <span className="font-semibold text-primary">HOTEL</span> {day.hotel.name}
                    </span>
                  ) : null}
                  {day.transfers.map((transfer, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-success/5 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      <span className="font-semibold text-success">TRANSFER</span> {transfer.label}
                    </span>
                  ))}
                  {day.activities.map((activity, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-accent/10 px-3 py-1 text-xs font-medium text-foreground"
                    >
                      <span className="font-semibold text-accent">ACTIVITY</span> {activity.name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">No hotel, transport, or activity added for this day yet.</p>
              )}

              {day.hotel?.mealPlan ? (
                <p className="text-xs text-muted-foreground">Meal Plan: {day.hotel.mealPlan}</p>
              ) : null}
            </div>
          </details>
        ))}
      </CardContent>
    </Card>
  );
}
