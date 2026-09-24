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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: boolean;
};

export function Sidebar({
  role,
  permittedModules,
}: {
  role: "ADMIN" | "EMPLOYEE";
  permittedModules: Module[];
}) {
  const pathname = usePathname();
  const has = (module: Module) => role === "ADMIN" || permittedModules.includes(module);

  const items: NavItem[] = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/enquiry", label: "Enquiry", icon: Inbox, show: has("ENQUIRY") },
    { href: "/clients", label: "Client Details", icon: Contact, show: has("ENQUIRY") },
    { href: "/hotel", label: "Hotel", icon: Building2, show: has("HOTEL") },
    { href: "/sightseeing", label: "Sightseeing", icon: MapPinned, show: has("SIGHTSEEING") },
    { href: "/transport", label: "Transport", icon: Bus, show: has("TRANSPORT") },
  ];

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-card md:flex print:hidden">
      <div className="flex h-16 items-center border-b border-border px-5">
        <Logo />
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {items
          .filter((item) => item.show)
          .map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="flex-1">{item.label}</span>
              </Link>
            );
          })}

        {role === "ADMIN" ? (
          <>
            <div className="mt-4 mb-1 px-3 text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Administration
            </div>
            <Link
              href="/employees"
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                pathname.startsWith("/employees") ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
              )}
            >
              <Users className="h-4 w-4 shrink-0" />
              <span className="flex-1">Employees</span>
            </Link>
          </>
        ) : null}
      </nav>
    </aside>
  );
}
