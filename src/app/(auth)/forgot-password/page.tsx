import { CenteredAuthShell } from "@/components/centered-auth-shell";
import { ForgotPasswordForm } from "@/components/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <CenteredAuthShell
      title="Forgot your password?"
      description="Enter the email address on your account and we'll send you a link to reset it."
    >
      <ForgotPasswordForm />
    </CenteredAuthShell>
  );
}
