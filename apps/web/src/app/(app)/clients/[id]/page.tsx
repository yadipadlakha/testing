import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { AutoSubmitSelect } from "@/components/auto-submit-select";
import { InteractionForm } from "@/components/interaction-form";
import { updateClientStage } from "@/lib/actions/client-actions";
import {
  LEAD_STAGES,
  LEAD_STAGE_LABEL,
  TRIP_STATUS_LABEL,
  TRIP_STATUS_VARIANT,
  INTERACTION_TYPE_LABEL,
} from "@/lib/labels";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Mail, Phone } from "lucide-react";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await requireSession();

  const client = await prisma.client.findFirst({
    where: { id, agencyId: session.user.agencyId },
    include: {
      owner: { select: { name: true } },
      interactions: { orderBy: { occurredAt: "desc" }, include: { user: { select: { name: true } } } },
      trips: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!client) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{client.name}</h1>
          <div className="mt-1 flex items-center gap-3 text-sm text-muted-foreground">
            {client.email ? (
              <span className="flex items-center gap-1">
                <Mail className="h-3.5 w-3.5" /> {client.email}
              </span>
            ) : null}
            {client.phone ? (
              <span className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5" /> {client.phone}
              </span>
            ) : null}
          </div>
        </div>
        <AutoSubmitSelect
          name="stage"
          defaultValue={client.stage}
          hidden={{ clientId: client.id }}
          action={updateClientStage}
          options={LEAD_STAGES.map((stage) => ({ value: stage, label: LEAD_STAGE_LABEL[stage] }))}
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        <div className="col-span-2 flex flex-col gap-6">
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Trips</CardTitle>
              <Link
                href={`/trips/new?clientId=${client.id}`}
                className={buttonVariants({ size: "sm", className: "flex items-center gap-1.5" })}
              >
                <Plus className="h-3.5 w-3.5" /> New trip
              </Link>
            </CardHeader>
            <CardContent>
              {client.trips.length === 0 ? (
                <p className="text-sm text-muted-foreground">No trips yet for this client.</p>
              ) : (
                <ul className="flex flex-col divide-y divide-border">
                  {client.trips.map((trip) => (
                    <li key={trip.id} className="flex items-center justify-between py-3">
                      <div>
                        <Link href={`/trips/${trip.id}`} className="font-medium text-foreground hover:text-accent">
                          {trip.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">
                          {trip.destination} · {formatCurrency(trip.budgetAmount?.toString(), trip.currency)}
                        </p>
                      </div>
                      <Badge variant={TRIP_STATUS_VARIANT[trip.status]}>{TRIP_STATUS_LABEL[trip.status]}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Interaction history</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <InteractionForm clientId={client.id} />
              <ul className="flex flex-col divide-y divide-border">
                {client.interactions.map((interaction) => (
                  <li key={interaction.id} className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="slate">{INTERACTION_TYPE_LABEL[interaction.type]}</Badge>
                        <span className="font-medium text-foreground">{interaction.subject}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{formatDate(interaction.occurredAt)}</span>
                    </div>
                    {interaction.content ? (
                      <p className="mt-1 text-sm text-muted-foreground">{interaction.content}</p>
                    ) : null}
                    <p className="mt-1 text-xs text-muted-foreground">by {interaction.user?.name ?? "Unknown"}</p>
                  </li>
                ))}
                {client.interactions.length === 0 ? (
                  <li className="py-6 text-center text-sm text-muted-foreground">No interactions logged yet.</li>
                ) : null}
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Details</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Owner</p>
                <p className="text-foreground">{client.owner?.name ?? "Unassigned"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Source</p>
                <p className="text-foreground">{client.source ?? "—"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Added</p>
                <p className="text-foreground">{formatDate(client.createdAt)}</p>
              </div>
              {client.notes ? (
                <div>
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Notes</p>
                  <p className="whitespace-pre-wrap text-foreground">{client.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
