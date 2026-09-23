export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight text-foreground">Voyager</span>
          <p className="mt-1 text-sm text-muted-foreground">AI itineraries &amp; travel CRM</p>
        </div>
        {children}
      </div>
    </div>
  );
}
