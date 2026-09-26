import Link from "next/link";
import { Inbox, Send, PauseCircle, CheckCircle2, PhoneCall, XCircle, Users, Plus } from "lucide-react";
import { requireSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ENQUIRY_STATUSES,
  STATUS_LABELS,
  STATUS_BADGE_VARIANT,
  formatEnquiryNumber,
  formatDate,
  enquiryScopeWhere,
} from "@/lib/enquiry";
import type { EnquiryStatus } from "@prisma/client";

const STATUS_ICONS: Record<EnquiryStatus, React.ComponentType<{ className?: string }>> = {
  NEW_QUERY: Inbox,
  QUOTATION_SENT: Send,
  ON_HOLD: PauseCircle,
  CONVERTED: CheckCircle2,
  FOLLOW_UP: PhoneCall,
  LOST: XCircle,
};

const STATUS_ACCENT: Record<EnquiryStatus, "blue" | "purple" | "amber" | "teal" | "cyan" | "rose"> = {
  NEW_QUERY: "blue",
  QUOTATION_SENT: "purple",
  ON_HOLD: "amber",
  CONVERTED: "teal",
  FOLLOW_UP: "cyan",
  LOST: "rose",
};

export default async function DashboardPage() {
  const session = await requireSession();
  const isAdmin = session.user.role === "ADMIN";
  const scope = enquiryScopeWhere(session);

  const [statusCounts, recentEnquiries, employeeCount] = await Promise.all([
    prisma.enquiry.groupBy({ by: ["status"], where: scope, _count: { _all: true } }),
    prisma.enquiry.findMany({
      where: scope,
      include: { client: true, allocatedUsers: true },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
    isAdmin ? prisma.user.count({ where: { role: "EMPLOYEE" } }) : Promise.resolve(0),
  ]);

  const countByStatus = Object.fromEntries(statusCounts.map((row) => [row.status, row._count._all])) as Record<
    EnquiryStatus,
    number
  >;
  const total = statusCounts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isAdmin ? "Business overview" : `Welcome back, ${session.user.name.split(" ")[0]}`}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {isAdmin
              ? "Enquiry pipeline across the whole team."
              : "Your allocated enquiries and what needs follow-up."}
          </p>
        </div>
        <Button asChild>
          <Link href="/enquiry/new">
            <Plus className="h-4 w-4" /> New Enquiry
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        <StatCard label={isAdmin ? "Total Enquiries" : "My Enquiries"} value={total} icon={Inbox} accent="primary" />
        {ENQUIRY_STATUSES.map((status) => (
          <StatCard
            key={status}
            label={STATUS_LABELS[status]}
            value={countByStatus[status] ?? 0}
            icon={STATUS_ICONS[status]}
            accent={STATUS_ACCENT[status]}
          />
        ))}
        {isAdmin ? <StatCard label="Employees" value={employeeCount} icon={Users} accent="primary" /> : null}
      </div>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Recent enquiries</CardTitle>
          <Link href="/enquiry" className="text-sm font-medium text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent>
          {recentEnquiries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">No enquiries yet.</p>
          ) : (
            <div className="flex flex-col divide-y divide-border">
              {recentEnquiries.map((enquiry) => (
                <Link
                  key={enquiry.id}
                  href={`/enquiry/${enquiry.id}`}
                  className="flex flex-col gap-2 py-3 transition-colors duration-150 first:pt-0 last:pb-0 hover:bg-primary/5 sm:flex-row sm:items-center sm:justify-between sm:rounded-md sm:px-2"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={STATUS_BADGE_VARIANT[enquiry.status]}>{STATUS_LABELS[enquiry.status]}</Badge>
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {formatEnquiryNumber(enquiry.enquiryNumber)} — {enquiry.client.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {enquiry.travelTo} · {formatDate(enquiry.travelDate)}
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Allocated to{" "}
                    {enquiry.allocatedUsers.length > 0
                      ? enquiry.allocatedUsers.map((u) => u.name).join(", ")
                      : "Unassigned"}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
