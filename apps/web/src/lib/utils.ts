// Re-exported so every component keeps importing `cn` from "@/lib/utils" —
// the actual implementation is shadcn/ui's own "cn" package (a clsx +
// tailwind-merge drop-in), used by every generated shadcn component.
export { cn } from "cn";

export function formatCurrency(amount: number | string | null | undefined, currency = "USD") {
  if (amount === null || amount === undefined) return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency }).format(value);
}

export function formatDate(date: Date | string | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-US", { year: "numeric", month: "short", day: "numeric" }).format(d);
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}
