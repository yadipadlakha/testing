"use client";

import { cn } from "@/lib/utils";

export function MultiSelectChips({
  name,
  options,
  selected,
  onChange,
}: {
  name: string;
  options: { value: string; label: string }[];
  selected: string[];
  onChange: (values: string[]) => void;
}) {
  function toggle(value: string) {
    onChange(selected.includes(value) ? selected.filter((v) => v !== value) : [...selected, value]);
  }

  return (
    <div className="flex flex-wrap gap-2">
      {selected.map((value) => (
        <input key={value} type="hidden" name={name} value={value} />
      ))}
      {options.map((option) => {
        const active = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => toggle(option.value)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
              active
                ? "border-accent bg-accent/10 text-accent"
                : "border-input text-muted-foreground hover:bg-muted",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
