import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { NewTripForm } from "@/components/new-trip-form";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireSession();
  const { clientId } = await searchParams;

  const clients = await prisma.client.findMany({
    where: { agencyId: session.user.agencyId },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="mb-6 text-2xl font-semibold text-slate-900">New trip</h1>
      <NewTripForm clients={clients} defaultClientId={clientId} />
    </div>
  );
}
