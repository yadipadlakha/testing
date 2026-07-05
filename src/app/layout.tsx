import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Andeverywhere — Travel CRM",
  description:
    "Andeverywhere — B2B travel enquiries, quotes and itineraries with contracted rates, all in one place.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col">
        {user ? (
          <>
            <Navbar user={user} />
            <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
              {children}
            </main>
            <Footer />
          </>
        ) : (
          // Unauthenticated (login) pages render without the app chrome.
          <main className="flex-1">{children}</main>
        )}
      </body>
    </html>
  );
}
