import { BrandPanel } from "@/components/brand-panel";
import { LoginForm } from "@/components/login-form";
import { Logo } from "@/components/logo";

export default function LoginPage() {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="hidden lg:block">
        <BrandPanel />
      </div>

      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo />
          </div>

          <h2 className="text-2xl font-semibold text-foreground">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your bookings and trips.</p>

          <div className="mt-8">
            <LoginForm />
          </div>

          <p className="mt-8 text-center text-sm text-muted-foreground lg:hidden">
            Need help? Contact us at{" "}
            <a href="mailto:support@traveleverywhere.com" className="font-medium text-primary hover:underline">
              support@traveleverywhere.com
            </a>
          </p>

          <p className="mt-8 border-t border-border pt-6 text-center text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} TravelEverywhere. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
