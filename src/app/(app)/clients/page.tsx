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
          <h1 className="text-2xl font-semibold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500">Leads and travelers across your pipeline.</p>
        </div>
        <Link href="/clients/new" className={buttonVariants({ className: "flex items-center gap-1.5" })}>
          <Plus className="h-4 w-4" /> New client
        </Link>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Stage</th>
              <th className="px-4 py-3 font-medium">Owner</th>
              <th className="px-4 py-3 font-medium">Trips</th>
              <th className="px-4 py-3 font-medium">Updated</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {clients.map((client) => (
              <tr key={client.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <Link href={`/clients/${client.id}`} className="font-medium text-slate-900 hover:text-indigo-600">
                    {client.name}
                  </Link>
                  <p className="text-xs text-slate-500">{client.email ?? client.phone ?? "—"}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={LEAD_STAGE_VARIANT[client.stage]}>{LEAD_STAGE_LABEL[client.stage]}</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">{client.owner?.name ?? "Unassigned"}</td>
                <td className="px-4 py-3 text-slate-600">{client._count.trips}</td>
                <td className="px-4 py-3 text-slate-500">{formatDate(client.updatedAt)}</td>
              </tr>
            ))}
            {clients.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500">
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
