import Link from "next/link";
import { CenteredAuthShell } from "@/components/centered-auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <CenteredAuthShell title="Invalid reset link" description="This password reset link is missing its token.">
        <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
          Request a new reset link
        </Link>
      </CenteredAuthShell>
    );
  }

  return (
    <CenteredAuthShell title="Reset your password" description="Choose a new password for your account.">
      <ResetPasswordForm token={token} />
    </CenteredAuthShell>
  );
}
