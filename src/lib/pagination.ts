export const PAGE_SIZE = 20;

/** Builds a query string from filter params plus a page number, dropping empty values and page=1. */
export function buildQuery(params: Record<string, string | undefined>, page: number): string {
  const usp = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value) usp.set(key, value);
  }
  if (page > 1) usp.set("page", String(page));
  const qs = usp.toString();
  return qs ? `?${qs}` : "";
}
