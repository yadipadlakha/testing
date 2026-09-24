import { Search, Phone, Mail, Building2, MapPin } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function ClientDetailsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleAccess("ENQUIRY");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const clients = await prisma.client.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { companyName: { contains: query, mode: "insensitive" } },
            { phone: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { enquiries: true } } },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Client Details</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every client captured from an enquiry, saved once and reused automatically.
        </p>
      </div>

      <form className="flex gap-2" action="/clients" method="get">
        <Input name="q" defaultValue={query} placeholder="Search by name, agency, or phone…" className="max-w-md" />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {clients.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No clients found{query ? ` matching “${query}”` : ""}.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {clients.map((client) => (
            <Card key={client.id} className="gap-2 p-4">
              <p className="text-sm font-semibold text-foreground">{client.name}</p>
              {client.companyName ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Building2 className="h-3 w-3" /> {client.companyName}
                </p>
              ) : null}
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {client.phone}
              </p>
              {client.email ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {client.email}
                </p>
              ) : null}
              {client.city || client.state ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {[client.city, client.state].filter(Boolean).join(", ")}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {client._count.enquiries} enquir{client._count.enquiries === 1 ? "y" : "ies"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
