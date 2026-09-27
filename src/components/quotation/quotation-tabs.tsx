import Link from "next/link";
import { cn } from "@/lib/utils";

export type QuotationTab = "quotation" | "voucher" | "invoice" | "profit";

const TABS: { id: QuotationTab; label: string }[] = [
  { id: "quotation", label: "Quotation" },
  { id: "voucher", label: "Service Voucher" },
  { id: "invoice", label: "Finance Invoice" },
  { id: "profit", label: "Profit" },
];

export function QuotationTabs({ quotationId, active }: { quotationId: string; active: QuotationTab }) {
  return (
    <div className="flex flex-wrap gap-2 print:hidden">
      {TABS.map((tab) => (
        <Link
          key={tab.id}
          href={tab.id === "quotation" ? `/quotations/${quotationId}` : `/quotations/${quotationId}?tab=${tab.id}`}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors duration-150",
            active === tab.id
              ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25"
              : "bg-muted text-muted-foreground hover:bg-primary/10 hover:text-primary",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
