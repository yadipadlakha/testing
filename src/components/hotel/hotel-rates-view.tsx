import { Trash2 } from "lucide-react";
import { deleteHotelSeason } from "@/lib/actions/hotel-actions";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatDate } from "@/lib/enquiry";

type Season = {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  roomRates: { id: string; roomCategory: string; roomType: string; mealPlan: string; pax: string; rate: number }[];
  extraRates: { id: string; label: string; rate: number }[];
};

export function HotelRatesView({ hotelId, currency, seasons }: { hotelId: string; currency: string; seasons: Season[] }) {
  if (seasons.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Rate Plans</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center text-sm text-muted-foreground">
            No rates imported yet. Use Import from CSV on the hotel list to add room types, meal plans, seasons, and
            rates for this property.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Rate Plans</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {seasons.map((season) => (
          <div key={season.id} className="flex flex-col gap-2 rounded-lg border border-border p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="font-medium text-foreground">{season.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(season.startDate)} – {formatDate(season.endDate)}
                </p>
              </div>
              <form action={deleteHotelSeason.bind(null, hotelId, season.id)}>
                <Button variant="destructive" size="sm" type="submit">
                  <Trash2 className="h-3.5 w-3.5" /> Remove season
                </Button>
              </form>
            </div>

            {season.roomRates.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                      <th className="py-1.5 pr-3">Room Category</th>
                      <th className="py-1.5 pr-3">Room Type</th>
                      <th className="py-1.5 pr-3">Meal Plan</th>
                      <th className="py-1.5 pr-3">Pax</th>
                      <th className="py-1.5 text-right">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {season.roomRates.map((rate) => (
                      <tr key={rate.id} className="border-b border-border/60 last:border-0">
                        <td className="py-1.5 pr-3 text-foreground">{rate.roomCategory}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{rate.roomType}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{rate.mealPlan}</td>
                        <td className="py-1.5 pr-3 text-muted-foreground">{rate.pax}</td>
                        <td className="py-1.5 text-right text-foreground">{formatCurrency(rate.rate, currency)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}

            {season.extraRates.length > 0 ? (
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                {season.extraRates.map((extra) => (
                  <span key={extra.id}>
                    {extra.label}: <span className="text-foreground">{formatCurrency(extra.rate, currency)}</span>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
