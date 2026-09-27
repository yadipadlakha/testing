import { Route } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { DayPlanList } from "@/components/quotation/day-plan-list";
import type { DayPlan } from "@/lib/itinerary";

export function TourOverview({ days }: { days: DayPlan[] }) {
  return (
    <Card>
      <CardHeader className="flex-row items-center gap-2">
        <Route className="h-4 w-4 text-muted-foreground" />
        <CardTitle>Tour Overview</CardTitle>
      </CardHeader>
      <CardContent className="px-0">
        <DayPlanList days={days} />
      </CardContent>
    </Card>
  );
}
