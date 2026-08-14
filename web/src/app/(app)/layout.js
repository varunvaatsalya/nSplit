import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }) {
  const session = await getSessionUser();
  if (!session?.user) redirect("/login");

  return (
    <AppShell
      user={{
        _id: String(session.user._id),
        name: session.user.name,
        email: session.user.email,
        avatar: session.user.avatar ?? null,
      }}
    >
      {children}
    </AppShell>
  );
}
