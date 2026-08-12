import { getSessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";

export default async function ProfilePage() {
  const session = await getSessionUser();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <div className="mt-6 space-y-3 rounded-xl border border-border bg-surface p-5 text-sm">
        <div>
          <div className="text-muted">Name</div>
          <div className="font-medium">{session.user.name}</div>
        </div>
        <div>
          <div className="text-muted">Email</div>
          <div className="font-medium">{session.user.email}</div>
        </div>
        <LogoutButton />
      </div>
    </div>
  );
}
