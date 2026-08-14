import { connectDb } from "@/lib/db";
import { Group, activeMembers } from "@/models";
import { ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { publicAvatar, coerceAvatar } from "@/lib/avatar";

/**
 * People the current user has shared groups with (excluding self).
 * Deduped by userId / email / displayName, ranked by shared group count.
 */
export async function GET() {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  await connectDb();
  const groups = await Group.find({
    members: { $elemMatch: { userId: auth.user._id, leftAt: null } },
  })
    .select("members")
    .lean();

  const meId = String(auth.user._id);
  const meEmail = String(auth.user.email || "")
    .trim()
    .toLowerCase();

  /** @type {Map<string, { name: string, email: string|null, userId: string|null, avatar: object|null, groupCount: number }>} */
  const map = new Map();

  for (const group of groups) {
    for (const member of activeMembers(group)) {
      const userId = member.userId ? String(member.userId) : null;
      const email = member.email
        ? String(member.email).trim().toLowerCase()
        : null;
      const name = (member.displayName || "").trim();
      if (!name) continue;
      if (userId && userId === meId) continue;
      if (email && meEmail && email === meEmail) continue;

      const key = userId
        ? `u:${userId}`
        : email
          ? `e:${email}`
          : `n:${name.toLowerCase()}`;

      const existing = map.get(key);
      if (existing) {
        existing.groupCount += 1;
        if (!existing.email && email) existing.email = email;
        if (!existing.userId && userId) existing.userId = userId;
        if (name.length > existing.name.length) existing.name = name;
        continue;
      }

      const avatar = publicAvatar(
        coerceAvatar(
          {
            avatar: member.avatar,
            avatarUrl: member.avatar?.url,
            avatarColor: member.avatar?.bg,
          },
          name
        ),
        name
      );

      map.set(key, {
        id: key,
        name,
        email,
        userId,
        avatar,
        groupCount: 1,
      });
    }
  }

  const contacts = [...map.values()].sort((a, b) => {
    if (b.groupCount !== a.groupCount) return b.groupCount - a.groupCount;
    return a.name.localeCompare(b.name);
  });

  return ok({ contacts });
}
