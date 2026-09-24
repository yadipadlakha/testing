"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ClientSuggestion = {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  companyName: string | null;
  city: string | null;
  state: string | null;
};

export function ClientFields({
  defaultValues,
}: {
  defaultValues?: {
    clientName?: string;
    clientPhone?: string;
    clientEmail?: string;
    companyName?: string;
    clientCity?: string;
    clientState?: string;
  };
}) {
  const [name, setName] = useState(defaultValues?.clientName ?? "");
  const [phone, setPhone] = useState(defaultValues?.clientPhone ?? "");
  const [email, setEmail] = useState(defaultValues?.clientEmail ?? "");
  const [company, setCompany] = useState(defaultValues?.companyName ?? "");
  const [city, setCity] = useState(defaultValues?.clientCity ?? "");
  const [state, setState] = useState(defaultValues?.clientState ?? "");
  const [suggestions, setSuggestions] = useState<ClientSuggestion[]>([]);
  const [activeField, setActiveField] = useState<"name" | "company" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeQuery = (activeField === "company" ? company : name).trim();

  useEffect(() => {
    if (!activeField || activeQuery.length < 3) return;
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      fetch(`/api/clients/search?q=${encodeURIComponent(activeQuery)}`, { signal: controller.signal })
        .then((res) => (res.ok ? res.json() : { clients: [] }))
        .then((data: { clients: ClientSuggestion[] }) => setSuggestions(data.clients ?? []))
        .catch(() => {});
    }, 250);
    return () => {
      clearTimeout(timeout);
      controller.abort();
    };
  }, [activeField, activeQuery]);

  const visibleSuggestions = activeField && activeQuery.length >= 3 ? suggestions : [];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setActiveField(null);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function selectClient(client: ClientSuggestion) {
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email ?? "");
    setCompany(client.companyName ?? "");
    setCity(client.city ?? "");
    setState(client.state ?? "");
    setActiveField(null);
  }

  return (
    <div ref={containerRef} className="grid gap-4 sm:grid-cols-2">
      <div className="relative flex flex-col gap-1.5">
        <Label htmlFor="clientName">Client name</Label>
        <Input
          id="clientName"
          name="clientName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onFocus={() => setActiveField("name")}
          autoComplete="off"
          required
        />
        {activeField === "name" && visibleSuggestions.length > 0 ? (
          <ClientSuggestionList suggestions={visibleSuggestions} onSelect={selectClient} />
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientPhone">Mobile number</Label>
        <Input id="clientPhone" name="clientPhone" value={phone} onChange={(e) => setPhone(e.target.value)} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientEmail">Email</Label>
        <Input
          id="clientEmail"
          name="clientEmail"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="relative flex flex-col gap-1.5">
        <Label htmlFor="companyName">Agency / company name</Label>
        <Input
          id="companyName"
          name="companyName"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          onFocus={() => setActiveField("company")}
          autoComplete="off"
        />
        {activeField === "company" && visibleSuggestions.length > 0 ? (
          <ClientSuggestionList suggestions={visibleSuggestions} onSelect={selectClient} />
        ) : null}
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientCity">City</Label>
        <Input id="clientCity" name="clientCity" value={city} onChange={(e) => setCity(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="clientState">State</Label>
        <Input id="clientState" name="clientState" value={state} onChange={(e) => setState(e.target.value)} />
      </div>
    </div>
  );
}

function ClientSuggestionList({
  suggestions,
  onSelect,
}: {
  suggestions: ClientSuggestion[];
  onSelect: (client: ClientSuggestion) => void;
}) {
  return (
    <div className="absolute top-full left-0 z-20 mt-1 w-full rounded-md border border-border bg-card shadow-md">
      {suggestions.map((client) => (
        <button
          key={client.id}
          type="button"
          onClick={() => onSelect(client)}
          className="flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-muted"
        >
          <span className="font-medium text-foreground">
            {client.companyName ? `${client.companyName} — ` : ""}
            {client.name}
          </span>
          <span className="text-xs text-muted-foreground">
            {client.phone}
            {client.email ? ` · ${client.email}` : ""}
          </span>
        </button>
      ))}
    </div>
  );
}
