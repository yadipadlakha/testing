"use client";

import { useActionState, useState } from "react";
import { createEnquiry } from "@/lib/actions/trip-actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { SubmitButton } from "@/components/submit-button";
import { AgentCombobox, type AgentOption } from "@/components/agent-combobox";
import { MultiSelectChips } from "@/components/multi-select-chips";
import { COUNTRIES } from "@/lib/countries";
import {
  ENQUIRY_TYPES,
  ENQUIRY_TYPE_LABEL,
  SERVICE_TYPES,
  SERVICE_TYPE_LABEL,
  FLIGHT_CLASSES,
  FLIGHT_CLASS_LABEL,
  HOTEL_TYPES,
  HOTEL_TYPE_LABEL,
  VEHICLE_TYPES,
  VEHICLE_TYPE_LABEL,
} from "@/lib/labels";

export function EnquiryForm({
  agents,
  defaultCustomer,
}: {
  agents: AgentOption[];
  defaultCustomer?: {
    companyName: string;
    name: string;
    mobile: string;
    whatsapp: string;
    email: string;
    city: string;
    country: string;
    address: string;
  };
}) {
  const [state, formAction] = useActionState(createEnquiry, undefined);

  const [agentAsTraveler, setAgentAsTraveler] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<AgentOption | null>(null);
  const [services, setServices] = useState<string[]>([]);

  const [customerName, setCustomerName] = useState(defaultCustomer?.name ?? "");
  const [mobile, setMobile] = useState(defaultCustomer?.mobile ?? "");
  const [email, setEmail] = useState(defaultCustomer?.email ?? "");

  function handleAgentAsTravelerChange(checked: boolean) {
    setAgentAsTraveler(checked);
    if (checked && selectedAgent) {
      setCustomerName(selectedAgent.name);
      setEmail(selectedAgent.email);
    }
  }

  return (
    <Card className="overflow-hidden py-0">
      <div className="bg-primary px-5 py-3">
        <h2 className="text-sm font-semibold tracking-wide text-primary-foreground uppercase">Enquiry</h2>
      </div>
      <CardContent className="p-5">
        <form action={formAction} className="flex flex-col gap-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-full max-w-sm">
              <Label className="mb-1.5 block">Agent</Label>
              <AgentCombobox
                agents={agents}
                name="agentId"
                onSelect={(agent) => {
                  setSelectedAgent(agent);
                  if (agentAsTraveler && agent) {
                    setCustomerName(agent.name);
                    setEmail(agent.email);
                  }
                }}
              />
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <Checkbox
                name="agentAsTraveler"
                checked={agentAsTraveler}
                onCheckedChange={(checked) => handleAgentAsTravelerChange(checked === true)}
              />
              <span>
                Agent as Traveller
                <span className="text-muted-foreground block text-xs">(Auto-fill customer fields)</span>
              </span>
            </label>
          </div>

          <div className="border-t pt-5">
            <p className="mb-3 text-xs font-semibold tracking-wide text-destructive uppercase">
              Customer Details:
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="companyName">Customer Company Name</Label>
                <Input id="companyName" name="companyName" defaultValue={defaultCustomer?.companyName} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="customerName">Customer Name *</Label>
                <Input
                  id="customerName"
                  name="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  readOnly={agentAsTraveler}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mobile">Mobile *</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="whatsapp">Whatsapp No</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={defaultCustomer?.whatsapp} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  readOnly={agentAsTraveler}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="city">City *</Label>
                <Input id="city" name="city" defaultValue={defaultCustomer?.city} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" defaultValue={defaultCustomer?.country} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="address">Address</Label>
                <Input id="address" name="address" defaultValue={defaultCustomer?.address} />
              </div>
            </div>
          </div>

          <div className="border-t pt-5">
            <p className="mb-3 text-xs font-semibold tracking-wide text-destructive uppercase">Requirement:</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="enquiryType">Enquiry For *</Label>
                <Select id="enquiryType" name="enquiryType" defaultValue="" required>
                  <option value="" disabled>
                    -- Select Enquiry Type --
                  </option>
                  {ENQUIRY_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {ENQUIRY_TYPE_LABEL[type]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5 lg:col-span-2">
                <Label>Service *</Label>
                <MultiSelectChips
                  name="services"
                  selected={services}
                  onChange={setServices}
                  options={SERVICE_TYPES.map((type) => ({ value: type, label: SERVICE_TYPE_LABEL[type] }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="travelDate">Travel Date *</Label>
                <Input id="travelDate" name="travelDate" type="date" required />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="travelFrom">Travel From *</Label>
                <Input id="travelFrom" name="travelFrom" placeholder="Departure city" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="destination">Destination *</Label>
                <Input id="destination" name="destination" placeholder="Type to search destination…" required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="numDays">No Of Days *</Label>
                <Input id="numDays" name="numDays" type="number" min={1} defaultValue={1} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="budgetAmount">Budget</Label>
                <div className="flex gap-2">
                  <Select name="currency" defaultValue="USD" className="w-24">
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="GBP">GBP</option>
                    <option value="INR">INR</option>
                    <option value="AED">AED</option>
                  </Select>
                  <Input id="budgetAmount" name="budgetAmount" type="number" min={0} step="0.01" />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="flightClass">Flight Class</Label>
                <Select id="flightClass" name="flightClass" defaultValue="">
                  <option value="">Select</option>
                  {FLIGHT_CLASSES.map((value) => (
                    <option key={value} value={value}>
                      {FLIGHT_CLASS_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="hotelType">Hotel Type</Label>
                <Select id="hotelType" name="hotelType" defaultValue="">
                  <option value="">Select</option>
                  {HOTEL_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {HOTEL_TYPE_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="vehicleType">Vehicle Type</Label>
                <Select id="vehicleType" name="vehicleType" defaultValue="">
                  <option value="">-- Select Type --</option>
                  {VEHICLE_TYPES.map((value) => (
                    <option key={value} value={value}>
                      {VEHICLE_TYPE_LABEL[value]}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="travelers">Travellers *</Label>
                <Input id="travelers" name="travelers" type="number" min={1} defaultValue={1} required />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="nationality">Nationality *</Label>
                <Select id="nationality" name="nationality" defaultValue="" required>
                  <option value="" disabled>
                    Select Nationality
                  </option>
                  {COUNTRIES.map((country) => (
                    <option key={country} value={country}>
                      {country}
                    </option>
                  ))}
                </Select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-1.5">
              <Label htmlFor="comment">Comment *</Label>
              <Textarea id="comment" name="comment" rows={3} required />
            </div>
          </div>

          {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
          <SubmitButton className="self-start">Create enquiry</SubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
