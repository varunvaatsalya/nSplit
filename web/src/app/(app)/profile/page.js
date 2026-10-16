import { getSessionUser } from "@/lib/auth/session";
import { LogoutButton } from "@/components/auth/logout-button";
import { FeedbackButton } from "@/components/feedback/feedback-button";
import { AppearanceButton } from "@/components/profile/appearance-button";
import { UserAvatar } from "@/components/user-avatar";

export default async function ProfilePage() {
  const session = await getSessionUser();

  return (
    <div className="mx-auto max-w-xl pb-16">
      <h1 className="text-[22px] font-bold">Profile</h1>

      <div className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-surface p-5">
        <UserAvatar
          className="h-16 w-16"
          fallbackClassName="text-lg"
          name={session.user.name}
          avatar={session.user.avatar}
          seed={session.user._id}
        />
        <div className="min-w-0">
          <div className="truncate text-lg font-bold">{session.user.name}</div>
          <div className="truncate text-sm text-muted">{session.user.email}</div>
        </div>
      </div>

      <div className="mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.08em] text-muted">Settings</div>
      <div className="space-y-2.5">
        <AppearanceButton />
        <FeedbackButton source="profile" />
      </div>

      <div className="mt-8 flex justify-center">
        <LogoutButton />
      </div>
    </div>
  );
}
