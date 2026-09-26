"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Module } from "@prisma/client";
import {
  LayoutDashboard,
  Inbox,
  Contact,
  Building2,
  MapPinned,
  Bus,
  Users,
  BriefcaseBusiness,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
};

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex items-center gap-3 overflow-hidden rounded-md px-3 py-2 text-sm font-medium transition-all duration-150",
        active
          ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
          : "text-foreground hover:translate-x-0.5 hover:bg-primary/8 hover:text-primary",
      )}
    >
      {active ? <span className="absolute top-1/2 left-0 h-5 w-1 -translate-y-1/2 rounded-r-full bg-accent" /> : null}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-150 group-hover:scale-110",
          active ? "text-primary-foreground" : "text-muted-foreground group-hover:text-primary",
        )}
      />
      <span className="flex-1">{item.label}</span>
    </Link>
  );
}

export function Sidebar({
  role,
  permittedModules,
}: {
  role: "ADMIN" | "EMPLOYEE";
  permittedModules: Module[];
}) {
  const pathname = usePathname();
  const has = (module: Module) => role === "ADMIN" || permittedModules.includes(module);
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/enquiry", label: "Enquiry", icon: Inbox, show: has("ENQUIRY") },
    { href: "/hotel", label: "Hotel", icon: Building2, show: has("HOTEL") },
    { href: "/sightseeing", label: "Sightseeing", icon: MapPinned, show: has("SIGHTSEEING") },
    { href: "/transport", label: "Transport", icon: Bus, show: has("TRANSPORT") },
  ];

  const masterDataItems: NavItem[] = [
    { href: "/clients", label: "Client Details", icon: Contact, show: has("ENQUIRY") },
    { href: "/sales-persons", label: "Sales Person", icon: BriefcaseBusiness, show: has("ENQUIRY") },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex print:hidden">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items
          .filter((item) => item.show)
          .map((item) => (
            <NavLink key={item.href} item={item} active={isActive(item.href)} />
          ))}

        {masterDataItems.some((item) => item.show) ? (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Master Data
            </div>
            {masterDataItems
              .filter((item) => item.show)
              .map((item) => (
                <NavLink key={item.href} item={item} active={isActive(item.href)} />
              ))}
          </>
        ) : null}

        {role === "ADMIN" ? (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Administration
            </div>
            <NavLink
              item={{ href: "/employees", label: "Employees", icon: Users, show: true }}
              active={isActive("/employees")}
            />
          </>
        ) : null}
      </nav>
    </aside>
  );
}
