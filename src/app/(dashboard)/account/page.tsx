import { requireSession } from "@/lib/session";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ChangeMyPasswordForm } from "@/components/account/change-my-password-form";

export default async function AccountPage() {
  const session = await requireSession();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My account</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {session.user.name} · {session.user.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Change password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangeMyPasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
