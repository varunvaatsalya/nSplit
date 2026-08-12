import Link from "next/link";
import { connectDb, toJSON } from "@/lib/db";
import { Group, activeMembers } from "@/models";
import { getSessionUser } from "@/lib/auth/session";

export default async function DashboardPage() {
  const session = await getSessionUser();
  await connectDb();

  const groups = await Group.find({
    members: { $elemMatch: { userId: session.user.id, leftAt: null } },
  })
    .sort({ updatedAt: -1 })
    .limit(8)
    .lean();

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="text-2xl font-semibold tracking-tight">
        Hi, {session.user.name}
      </h1>
      <p className="mt-1 text-muted">Your groups and recent activity at a glance.</p>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted">Groups</h2>
        <Link href="/groups" className="text-sm text-primary hover:underline">
          View all
        </Link>
      </div>

      {groups.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-surface p-8 text-center">
          <p className="text-sm text-muted">No groups yet.</p>
          <Link
            href="/groups"
            className="mt-4 inline-flex rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            Create a group
          </Link>
        </div>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2">
          {groups.map((g) => {
            const json = toJSON(g);
            return (
              <li key={json.id}>
                <Link
                  href={`/groups/${json.id}`}
                  className="block rounded-xl border border-border bg-surface p-4 hover:border-primary/40"
                >
                  <div className="font-medium">{json.name}</div>
                  <div className="mt-1 text-xs text-muted">
                    {json.currency} · {activeMembers(g).length} members
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
