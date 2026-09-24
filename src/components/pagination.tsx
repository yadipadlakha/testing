import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function pageWindow(page: number, totalPages: number): (number | "…")[] {
  const pages = new Set<number>([1, totalPages, page, page - 1, page + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);
  const result: (number | "…")[] = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push("…");
    result.push(sorted[i]);
  }
  return result;
}

export function Pagination({
  page,
  pageSize,
  totalCount,
  buildHref,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  buildHref: (page: number) => string;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  if (totalCount === 0) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, totalCount);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
      <p>
        Showing {start}–{end} of {totalCount}
      </p>
      {totalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Link
            href={buildHref(Math.max(1, page - 1))}
            aria-disabled={page <= 1}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted",
              page <= 1 && "pointer-events-none opacity-40",
            )}
          >
            <ChevronLeft className="h-4 w-4" />
          </Link>
          {pageWindow(page, totalPages).map((p, i) =>
            p === "…" ? (
              <span key={`ellipsis-${i}`} className="px-1 text-muted-foreground">
                …
              </span>
            ) : (
              <Link
                key={p}
                href={buildHref(p)}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-md text-sm font-medium",
                  p === page ? "bg-primary text-primary-foreground" : "text-foreground hover:bg-muted",
                )}
              >
                {p}
              </Link>
            ),
          )}
          <Link
            href={buildHref(Math.min(totalPages, page + 1))}
            aria-disabled={page >= totalPages}
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-md border border-border hover:bg-muted",
              page >= totalPages && "pointer-events-none opacity-40",
            )}
          >
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
