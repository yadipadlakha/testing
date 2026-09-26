"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Module } from "@prisma/client";
import { LayoutDashboard, Inbox, Contact, Building2, MapPinned, Bus, Users, BriefcaseBusiness } from "lucide-react";
import { cn } from "@/lib/utils";
import { signOutAction } from "@/lib/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/logo";

export function Topbar({
  name,
  email,
  role,
  permittedModules,
}: {
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  permittedModules: Module[];
}) {
  const pathname = usePathname();
  const has = (module: Module) => role === "ADMIN" || permittedModules.includes(module);

  const mobileItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, show: true },
    { href: "/enquiry", label: "Enquiry", icon: Inbox, show: has("ENQUIRY") },
    { href: "/clients", label: "Client Details", icon: Contact, show: has("ENQUIRY") },
    { href: "/sales-persons", label: "Sales Person", icon: BriefcaseBusiness, show: has("ENQUIRY") },
    { href: "/hotel", label: "Hotel", icon: Building2, show: has("HOTEL") },
    { href: "/sightseeing", label: "Sightseeing", icon: MapPinned, show: has("SIGHTSEEING") },
    { href: "/transport", label: "Transport", icon: Bus, show: has("TRANSPORT") },
    { href: "/employees", label: "Employees", icon: Users, show: role === "ADMIN" },
  ].filter((item) => item.show);

  return (
    <header className="sticky top-0 z-10 border-b border-border bg-card print:hidden">
      <div className="flex h-16 items-center justify-between gap-4 px-4 sm:px-6">
        <div className="md:hidden">
          <Logo />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="hidden text-right sm:block">
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{email}</p>
          </div>
          <span className="rounded-full bg-gradient-to-br from-primary/15 to-accent/15 px-2.5 py-1 text-xs font-semibold text-primary">
            {role === "ADMIN" ? "Admin" : "Employee"}
          </span>
          <form action={signOutAction}>
            <Button variant="outline" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>
      </div>

      <nav className="flex gap-1 overflow-x-auto border-t border-border px-3 py-2 md:hidden">
        {mobileItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150",
                active
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
                  : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
