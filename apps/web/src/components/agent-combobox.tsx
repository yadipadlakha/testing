"use client";

import { useMemo, useRef, useState } from "react";
import { User } from "lucide-react";
import { cn } from "@/lib/utils";

export type AgentOption = { id: string; name: string; email: string };

export function AgentCombobox({
  agents,
  name,
  defaultAgent,
  onSelect,
}: {
  agents: AgentOption[];
  name: string;
  defaultAgent?: AgentOption;
  onSelect?: (agent: AgentOption | null) => void;
}) {
  const [query, setQuery] = useState(defaultAgent?.name ?? "");
  const [selected, setSelected] = useState<AgentOption | null>(defaultAgent ?? null);
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const matches = useMemo(() => {
    if (query.trim().length < 4) return [];
    const q = query.toLowerCase();
    return agents.filter(
      (agent) => agent.name.toLowerCase().includes(q) || agent.email.toLowerCase().includes(q),
    );
  }, [agents, query]);

  function choose(agent: AgentOption) {
    setSelected(agent);
    setQuery(agent.name);
    setOpen(false);
    onSelect?.(agent);
  }

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="relative">
        <User className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (selected) {
              setSelected(null);
              onSelect?.(null);
            }
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Enter agent name, code or email"
          className={cn(
            "border-input bg-card flex h-9 w-full rounded-md border py-1 pr-3 pl-9 text-sm shadow-xs transition-colors",
            "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
          )}
        />
      </div>
      {open && query.trim().length >= 4 ? (
        <div className="bg-popover text-popover-foreground absolute z-50 mt-1 max-h-56 w-full overflow-auto rounded-md border shadow-md">
          {matches.length === 0 ? (
            <p className="text-muted-foreground px-3 py-2 text-sm">No matching agents.</p>
          ) : (
            matches.map((agent) => (
              <button
                key={agent.id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(agent)}
                className="hover:bg-muted flex w-full flex-col items-start px-3 py-2 text-left text-sm"
              >
                <span className="font-medium">{agent.name}</span>
                <span className="text-muted-foreground text-xs">{agent.email}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
