export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-slate-900">Voyager</span>
          <p className="mt-1 text-sm text-slate-500">AI itineraries &amp; travel CRM</p>
        </div>
        {children}
      </div>
    </div>
  );
}
