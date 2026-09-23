import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { LEAD_STAGE_LABEL, LEAD_STAGE_VARIANT } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import { Plus } from "lucide-react";

export default async function ClientsPage() {
  const session = await requireSession();

  const clients = await prisma.client.findMany({
    where: { agencyId: session.user.agencyId },
    include: { owner: { select: { name: true } }, _count: { select: { trips: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">Leads and travelers across your pipeline.</p>
        </div>
        <Link href="/clients/new" className={buttonVariants({ className: "flex items-center gap-1.5" })}>
          <Plus className="h-4 w-4" /> New client
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-muted text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Trips</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-muted">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium text-foreground hover:text-accent">
                    {client.name}
                  </Link>
                  <p className="text-xs text-muted-foreground">{client.email ?? client.phone ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={LEAD_STAGE_VARIANT[client.stage]}>{LEAD_STAGE_LABEL[client.stage]}</Badge>
                </td>
                <td className="px-4 py-3 text-muted-foreground">{client.owner?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-muted-foreground">{client._count.trips}</td>
                <td className="px-4 py-3 text-muted-foreground">{formatDate(client.updatedAt)}</td>
              </tr>
            ))}
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-muted-foreground">
                  No clients yet. Add your first lead to get started.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
