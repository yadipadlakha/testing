import type { Module } from "@prisma/client";

const MODULES: { value: Module; label: string; comingSoon?: boolean }[] = [
  { value: "ENQUIRY", label: "Enquiry" },
  { value: "HOTEL", label: "Hotel", comingSoon: true },
  { value: "SIGHTSEEING", label: "Sightseeing", comingSoon: true },
  { value: "TRANSPORT", label: "Transport", comingSoon: true },
];

export function ModuleCheckboxes({ defaultChecked = [] }: { defaultChecked?: Module[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {MODULES.map((module) => (
        <label
          key={module.value}
          className="flex items-center gap-2.5 rounded-md border border-border px-3 py-2.5 text-sm has-[:checked]:border-primary has-[:checked]:bg-primary/5"
        >
          <input
            type="checkbox"
            name="modules"
            value={module.value}
            defaultChecked={defaultChecked.includes(module.value)}
            className="h-4 w-4 accent-primary"
          />
          <span className="font-medium text-foreground">{module.label}</span>
          {module.comingSoon ? (
            <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
          ) : null}
        </label>
      ))}
    </div>
  );
}
