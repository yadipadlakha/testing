import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/session";
import { EnquiryForm } from "@/components/enquiry-form";

export default async function NewTripPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  const session = await requireSession();
  const { clientId } = await searchParams;

  const [agents, client] = await Promise.all([
    prisma.user.findMany({
      where: { agencyId: session.user.agencyId },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
    clientId
      ? prisma.client.findFirst({
          where: { id: clientId, agencyId: session.user.agencyId },
        })
      : null,
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="mb-6 text-2xl font-semibold text-foreground">New enquiry</h1>
      <EnquiryForm
        agents={agents}
        defaultCustomer={
          client
            ? {
                companyName: client.companyName ?? "",
                name: client.name,
                mobile: client.phone ?? "",
                whatsapp: client.whatsapp ?? "",
                email: client.email ?? "",
                city: client.city ?? "",
                country: client.country ?? "",
                address: client.address ?? "",
              }
            : undefined
        }
      />
    </div>
  );
}
