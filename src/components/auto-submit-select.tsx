"use client";

import { useRef } from "react";
import { Select } from "@/components/ui/select";

export function AutoSubmitSelect({
  name,
  defaultValue,
  options,
  action,
  hidden,
}: {
  name: string;
  defaultValue: string;
  options: { value: string; label: string }[];
  action: (formData: FormData) => void;
  hidden: Record<string, string>;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={action}>
      {Object.entries(hidden).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Select
        name={name}
        defaultValue={defaultValue}
        onChange={() => formRef.current?.requestSubmit()}
        className="w-auto"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </form>
  );
}
