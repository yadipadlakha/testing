import Link from "next/link";
import { Plus, Search, Pencil, Trash2, Phone, Mail, MapPin } from "lucide-react";
import { requireModuleAccess } from "@/lib/permissions";
import { prisma } from "@/lib/prisma";
import { deleteSalesPerson } from "@/lib/actions/sales-person-actions";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default async function SalesPersonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireModuleAccess("ENQUIRY");
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const salesPersons = await prisma.salesPerson.findMany({
    where: query
      ? {
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { contactNumber: { contains: query, mode: "insensitive" } },
            { email: { contains: query, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: { _count: { select: { enquiries: true } } },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Sales Person</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage sales persons available to tag on an enquiry.
          </p>
        </div>
        <Button asChild>
          <Link href="/sales-persons/new">
            <Plus className="h-4 w-4" /> Add Sales Person
          </Link>
        </Button>
      </div>

      <form className="flex gap-2" action="/sales-persons" method="get">
        <Input name="q" defaultValue={query} placeholder="Search by name, phone, or email…" className="max-w-md" />
        <Button type="submit" variant="secondary">
          <Search className="h-4 w-4" /> Search
        </Button>
      </form>

      {salesPersons.length === 0 ? (
        <Card className="items-center justify-center py-16 text-center text-sm text-muted-foreground">
          No sales persons found{query ? ` matching “${query}”` : ""}.
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {salesPersons.map((person) => (
            <Card key={person.id} className="gap-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-semibold text-foreground">{person.name}</p>
                <div className="flex gap-1">
                  <Button asChild variant="outline" size="icon-sm">
                    <Link href={`/sales-persons/${person.id}/edit`}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Link>
                  </Button>
                  <form action={deleteSalesPerson.bind(null, person.id)}>
                    <Button variant="destructive" size="icon-sm" type="submit">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </form>
                </div>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <Phone className="h-3 w-3" /> {person.contactNumber}
              </p>
              {person.email ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Mail className="h-3 w-3" /> {person.email}
                </p>
              ) : null}
              {person.city || person.state || person.country ? (
                <p className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" /> {[person.city, person.state, person.country].filter(Boolean).join(", ")}
                </p>
              ) : null}
              <p className="mt-1 text-xs text-muted-foreground">
                {person._count.enquiries} enquir{person._count.enquiries === 1 ? "y" : "ies"}
              </p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
