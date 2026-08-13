import { User } from "@/models/User";
import {
  coerceAvatar,
  letterCandidates,
  pickAvatarBg,
  pickLetters,
  publicAvatar,
} from "@/lib/avatar";

async function loadUsedUserAvatars(excludeUserId = null) {
  const filter = excludeUserId ? { _id: { $ne: excludeUserId } } : {};
  const users = await User.find(filter)
    .select("avatar avatarUrl avatarColor name")
    .lean();

  const letters = [];
  const bgs = [];
  for (const u of users) {
    const a = coerceAvatar(u, u.name);
    if (a.letters) letters.push(a.letters);
    if (a.bg) bgs.push(a.bg);
  }
  return { letters, bgs };
}

/** Allocate a full avatar object for a new user. */
export async function allocateUserAvatar(name, { excludeUserId } = {}) {
  const used = await loadUsedUserAvatars(excludeUserId);
  return {
    url: null,
    letters: pickLetters(name, used.letters),
    bg: pickAvatarBg(used.bgs),
  };
}

/**
 * Ensure user.avatar = { url, letters, bg } is complete.
 * Migrates legacy avatarUrl / avatarColor when present.
 */
export async function ensureUserAvatar(user) {
  if (!user) return null;

  const current = coerceAvatar(user, user.name);
  const complete = Boolean(current.letters && current.bg);
  if (complete && user.avatar?.letters && user.avatar?.bg) {
    return publicAvatar(user.avatar, user.name);
  }

  const used = await loadUsedUserAvatars(user._id || user.id);
  // Don't collide with ourselves if we somehow already hold letters
  const selfLetters = current.letters;
  const letters =
    current.letters &&
    !used.letters
      .map((l) => String(l).toUpperCase())
      .includes(String(current.letters).toUpperCase())
      ? String(current.letters).toUpperCase()
      : pickLetters(user.name, used.letters.filter((l) => l !== selfLetters));

  const bg =
    current.bg ||
    pickAvatarBg(used.bgs.filter((c) => c !== current.bg));

  const avatar = {
    url: current.url ?? null,
    letters,
    bg,
  };

  await User.updateOne(
    { _id: user._id || user.id },
    {
      $set: { avatar },
      $unset: { avatarUrl: 1, avatarColor: 1 },
    }
  );

  user.avatar = avatar;
  delete user.avatarUrl;
  delete user.avatarColor;
  return publicAvatar(avatar, user.name);
}

function memberAvatarSource(m, user = null) {
  if (m?.avatar?.letters && m?.avatar?.bg) return m.avatar;
  if (user?.avatar?.letters && user?.avatar?.bg) return user.avatar;
  // legacy
  if (m?.avatarColor || user?.avatarColor || user?.avatarUrl || m?.avatar) {
    return coerceAvatar(
      {
        avatar: m.avatar,
        avatarUrl: user?.avatarUrl ?? m.avatar?.url,
        avatarColor: m.avatarColor || user?.avatarColor || m.avatar?.bg,
      },
      m.displayName || user?.name
    );
  }
  return null;
}

export function collectGroupUsedAvatars(members, userMap = new Map()) {
  const letters = [];
  const bgs = [];
  for (const m of members || []) {
    const uid = m.userId ? String(m.userId) : null;
    const u = uid ? userMap.get(uid) : null;
    const a = memberAvatarSource(m, u);
    if (a?.letters) letters.push(a.letters);
    if (a?.bg) bgs.push(a.bg);
  }
  return { letters, bgs };
}

export function allocateMemberAvatar(
  displayName,
  used,
  linkedUser = null
) {
  const fromUser = linkedUser
    ? publicAvatar(coerceAvatar(linkedUser, linkedUser.name), linkedUser.name)
    : null;

  if (fromUser?.letters && fromUser?.bg) {
    const letterTaken = used.letters.some(
      (l) => String(l).toUpperCase() === fromUser.letters.toUpperCase()
    );
    const bgTaken = used.bgs.some(
      (c) => String(c).toLowerCase() === String(fromUser.bg).toLowerCase()
    );
    if (!letterTaken && !bgTaken) {
      return {
        url: fromUser.url,
        letters: fromUser.letters,
        bg: fromUser.bg,
      };
    }
    if (!letterTaken) {
      return {
        url: fromUser.url,
        letters: fromUser.letters,
        bg: pickAvatarBg(used.bgs),
      };
    }
  }

  return {
    url: fromUser?.url ?? null,
    letters: pickLetters(displayName, used.letters),
    bg: pickAvatarBg(used.bgs),
  };
}

/**
 * Persist missing member.avatar objects. Mutates group.members.
 * Returns whether save is needed.
 */
export async function backfillGroupMemberAvatars(group, userMap = new Map()) {
  if (!group?.members?.length) return false;

  const active = (group.members || []).filter((m) => !m.leftAt);
  const used = collectGroupUsedAvatars(active, userMap);
  let dirty = false;

  for (const m of group.members) {
    if (m.leftAt) continue;
    if (m.avatar?.letters && m.avatar?.bg) continue;

    const uid = m.userId ? String(m.userId) : null;
    const linked = uid ? userMap.get(uid) : null;
    if (linked) await ensureUserAvatar(linked);

    // Temporarily ignore incomplete self from used sets
    const avatar = allocateMemberAvatar(
      m.displayName || linked?.name || "Member",
      used,
      linked
    );

    m.avatar = avatar;
    m.avatarColor = undefined;
    used.letters.push(avatar.letters);
    used.bgs.push(avatar.bg);
    dirty = true;
  }

  return dirty;
}

export { letterCandidates, publicAvatar };
