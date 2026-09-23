import { Plane, Hotel, Package, ShieldCheck, FileCheck2, Headphones, Mail, Phone } from "lucide-react";
import { Logo } from "@/components/logo";

const SERVICES = [
  { icon: Plane, label: "Flight Booking" },
  { icon: Hotel, label: "Hotel Stays" },
  { icon: Package, label: "Holiday Packages" },
  { icon: FileCheck2, label: "Visa Assistance" },
  { icon: ShieldCheck, label: "Travel Insurance" },
  { icon: Headphones, label: "24/7 Support" },
];

export function BrandPanel() {
  return (
    <div className="relative flex h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-secondary px-8 py-10 text-white sm:px-12 sm:py-12">
      {/* decorative background accents */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-32 -left-16 h-80 w-80 rounded-full bg-white/5" />

      <div className="relative flex flex-col gap-8">
        <Logo variant="light" />

        <div>
          <h1 className="text-3xl leading-tight font-bold sm:text-4xl">Your journey begins here.</h1>
          <p className="mt-3 max-w-md text-sm text-white/80 sm:text-base">
            TravelEverywhere helps thousands of travelers plan flights, stays, and complete holiday
            packages with confidence — backed by real support whenever you need it.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">About us</p>
          <p className="mt-2 max-w-md text-sm text-white/80">
            Founded to make travel simple, TravelEverywhere connects you to trusted airlines,
            hotels, and local experts across 120+ destinations — so every trip, big or small, is
            planned right.
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold tracking-wide text-white/70 uppercase">What we offer</p>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {SERVICES.map(({ icon: Icon, label }) => (
              <div
                key={label}
                className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2.5 text-sm font-medium"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="relative mt-10 flex flex-col gap-2 border-t border-white/15 pt-6 text-sm text-white/80">
        <a href="mailto:support@traveleverywhere.com" className="flex items-center gap-2 hover:text-white">
          <Mail className="h-4 w-4" /> support@traveleverywhere.com
        </a>
        <a href="tel:+18005550199" className="flex items-center gap-2 hover:text-white">
          <Phone className="h-4 w-4" /> +1 (800) 555-0199
        </a>
      </div>
    </div>
  );
}
