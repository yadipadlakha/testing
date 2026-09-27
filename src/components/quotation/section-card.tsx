export function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-md border border-border print:break-inside-avoid">
      <div className="bg-secondary px-4 py-2 text-sm font-semibold tracking-wide text-secondary-foreground uppercase">
        {title}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
