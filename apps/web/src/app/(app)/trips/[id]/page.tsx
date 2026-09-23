import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { GenerateItineraryForm } from "@/components/generate-itinerary-form";
import { ManualItineraryForm } from "@/components/manual-itinerary-form";
import { AddDayForm } from "@/components/add-day-form";
import { AddActivityForm } from "@/components/add-activity-form";
import { updateTripStatus, deleteItinerary } from "@/lib/actions/trip-actions";
import { deleteItineraryDay, deleteItineraryActivity } from "@/lib/actions/itinerary-actions";
import {
  TRIP_STATUSES,
  TRIP_STATUS_LABEL,
  ACTIVITY_CATEGORY_LABEL,
  ACTIVITY_CATEGORY_VARIANT,
  ENQUIRY_TYPE_LABEL,
  SERVICE_TYPE_LABEL,
  FLIGHT_CLASS_LABEL,
  HOTEL_TYPE_LABEL,
  VEHICLE_TYPE_LABEL,
} from "@/lib/labels";
import { formatDate, formatCurrency } from "@/lib/utils";
import { RefreshCw, Trash2 } from "lucide-react";

export default async function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const trip = await prisma.trip.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      client: { select: { id: true, name: true } },
      owner: { select: { name: true } },
      itinerary: {
        include: { days: { orderBy: { dayNumber: "asc" }, include: { activities: { orderBy: { order: "asc" } } } } },
      },
    },
  });

  if (!trip) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            <Link href={`/clients/${trip.client.id}`} className="hover:text-accent">
              {trip.client.name}
            </Link>
          </p>
          <h1 className="text-2xl font-semibold text-foreground">{trip.title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {trip.destination}
            {trip.startDate ? ` · ${formatDate(trip.startDate)}` : ""}
            {trip.endDate ? ` – ${formatDate(trip.endDate)}` : ""}
            {" · "}
            {trip.travelers} traveler{trip.travelers === 1 ? "" : "s"}
            {" · "}
            {formatCurrency(trip.budgetAmount?.toString(), trip.currency)} budget
          </p>
        </div>
        <AutoSubmitSelect
          name="status"
          defaultValue={trip.status}
          hidden={{ tripId: trip.id }}
          action={updateTripStatus}
          options={TRIP_STATUSES.map((status) => ({ value: status, label: TRIP_STATUS_LABEL[status] }))}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Enquiry details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm sm:grid-cols-3 lg:grid-cols-4">
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Agent</dt>
              <dd className="text-foreground">{trip.owner?.name ?? "Unassigned"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Enquiry for</dt>
              <dd className="text-foreground">
                {trip.enquiryType ? ENQUIRY_TYPE_LABEL[trip.enquiryType] : "—"}
                {trip.agentAsTraveler ? " (agent is traveler)" : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Travel from</dt>
              <dd className="text-foreground">{trip.travelFrom ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">No. of days</dt>
              <dd className="text-foreground">{trip.numDays ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Nationality</dt>
              <dd className="text-foreground">{trip.nationality ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Flight class</dt>
              <dd className="text-foreground">{trip.flightClass ? FLIGHT_CLASS_LABEL[trip.flightClass] : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Hotel type</dt>
              <dd className="text-foreground">{trip.hotelType ? HOTEL_TYPE_LABEL[trip.hotelType] : "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground uppercase">Vehicle type</dt>
              <dd className="text-foreground">{trip.vehicleType ? VEHICLE_TYPE_LABEL[trip.vehicleType] : "—"}</dd>
            </div>
            <div className="col-span-2 sm:col-span-3 lg:col-span-4">
              <dt className="text-xs text-muted-foreground uppercase">Services</dt>
              <dd className="mt-1 flex flex-wrap gap-1.5">
                {trip.services.length === 0 ? (
                  <span className="text-foreground">—</span>
                ) : (
                  trip.services.map((service) => (
                    <Badge key={service} variant="slate">
                      {SERVICE_TYPE_LABEL[service]}
                    </Badge>
                  ))
                )}
              </dd>
            </div>
            {trip.comment ? (
              <div className="col-span-2 sm:col-span-3 lg:col-span-4">
                <dt className="text-xs text-muted-foreground uppercase">Comment</dt>
                <dd className="text-foreground whitespace-pre-wrap">{trip.comment}</dd>
              </div>
            ) : null}
          </dl>
        </CardContent>
      </Card>

      {!trip.itinerary ? (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Itinerary Builder</CardTitle>
              <p className="text-sm text-muted-foreground">Requires an Anthropic API key configured on the server.</p>
            </CardHeader>
            <CardContent>
              <GenerateItineraryForm tripId={trip.id} />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Build manually</CardTitle>
              <p className="text-sm text-muted-foreground">No AI needed — add days and activities yourself to put together a quotation.</p>
            </CardHeader>
            <CardContent>
              <ManualItineraryForm tripId={trip.id} />
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-start justify-between">
              <div>
                <CardTitle>Trip summary</CardTitle>
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{trip.itinerary.summary}</p>
              </div>
              {trip.itinerary.totalEstimatedCost ? (
                <Badge variant="green">
                  Est. {formatCurrency(trip.itinerary.totalEstimatedCost.toString(), trip.itinerary.currency)}
                </Badge>
              ) : null}
            </CardHeader>
            <CardContent>
              <details className="group">
                <summary className="flex w-fit cursor-pointer items-center gap-1.5 text-sm font-medium text-accent">
                  <RefreshCw className="h-3.5 w-3.5" /> Regenerate with new preferences
                </summary>
                <div className="mt-3">
                  <GenerateItineraryForm tripId={trip.id} regenerate />
                </div>
              </details>
              <form action={deleteItinerary.bind(null, trip.id)} className="mt-3">
                <button
                  type="submit"
                  className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:text-red-500"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Delete itinerary
                </button>
              </form>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-4">
            {trip.itinerary.days.map((day) => (
              <Card key={day.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      Day {day.dayNumber}: {day.title}
                    </CardTitle>
                    <div className="flex items-center gap-3">
                      {day.location ? <span className="text-xs text-muted-foreground">{day.location}</span> : null}
                      <form action={deleteItineraryDay.bind(null, trip.id, day.id)}>
                        <button type="submit" className="text-muted-foreground hover:text-red-500" title="Delete day">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </form>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <ul className="flex flex-col divide-y divide-border">
                    {day.activities.map((activity) => (
                      <li key={activity.id} className="flex gap-4 py-3">
                        <div className="w-16 shrink-0 text-sm font-medium text-muted-foreground">
                          {activity.startTime ?? ""}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-foreground">{activity.title}</p>
                            <Badge variant={ACTIVITY_CATEGORY_VARIANT[activity.category]}>
                              {ACTIVITY_CATEGORY_LABEL[activity.category]}
                            </Badge>
                          </div>
                          {activity.description ? (
                            <p className="mt-1 text-sm text-muted-foreground">{activity.description}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {activity.location ?? ""}
                            {activity.location && (activity.durationMinutes || activity.estimatedCost) ? " · " : ""}
                            {activity.durationMinutes ? `${activity.durationMinutes} min` : ""}
                            {activity.durationMinutes && activity.estimatedCost ? " · " : ""}
                            {activity.estimatedCost
                              ? formatCurrency(activity.estimatedCost.toString(), activity.currency)
                              : ""}
                          </p>
                        </div>
                        <form action={deleteItineraryActivity.bind(null, trip.id, activity.id)}>
                          <button type="submit" className="text-muted-foreground hover:text-red-500" title="Delete activity">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </form>
                      </li>
                    ))}
                    {day.activities.length === 0 ? (
                      <li className="py-3 text-sm text-muted-foreground">No activities yet.</li>
                    ) : null}
                  </ul>
                  <AddActivityForm tripId={trip.id} dayId={day.id} />
                </CardContent>
              </Card>
            ))}
            <AddDayForm tripId={trip.id} itineraryId={trip.itinerary.id} />
          </div>
        </div>
      )}
    </div>
  );
}
