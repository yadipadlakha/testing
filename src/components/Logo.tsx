// Andeverywhere wordmark: a red ampersand mark next to a stacked
// "and" (red) over "everywhere" (navy), echoing the brand logo.
export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-accent-500 text-xl font-black leading-none text-white shadow-sm">
        &amp;
      </span>
      {!compact && (
        <span className="flex flex-col leading-[0.92]">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-accent-500">
            and
          </span>
          <span className="text-lg font-extrabold tracking-tight text-brand-700">
            everywhere
          </span>
        </span>
      )}
    </span>
  );
}
