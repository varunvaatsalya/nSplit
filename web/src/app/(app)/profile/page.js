import { getSessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";
import { UserAvatar } from "@/components/user-avatar";

export default async function ProfilePage() {
  const session = await getSessionUser();

  return (
    <div className="mx-auto max-w-lg">
      <h1 className="text-2xl font-semibold tracking-tight">Profile</h1>
      <div className="mt-6 space-y-4 rounded-xl border border-border bg-surface p-5 text-sm">
        <div className="flex items-center gap-3">
          <UserAvatar
            className="h-14 w-14"
            fallbackClassName="text-base"
            name={session.user.name}
            avatar={session.user.avatar}
            seed={session.user.id}
          />
          <div className="min-w-0">
            <div className="truncate font-medium">{session.user.name}</div>
            <div className="truncate text-muted">{session.user.email}</div>
          </div>
        </div>
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
