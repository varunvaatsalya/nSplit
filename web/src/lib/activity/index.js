import { connectDb } from "@/lib/db";
import { Activity } from "@/models";

export async function recordActivity({
  groupId,
  actorId,
  action,
  entityType,
  entityId = null,
  metadata = null,
  session = null,
}) {
  await connectDb();
  const docs = [
    {
      groupId,
      actorId,
      action,
      entityType,
      entityId: entityId != null ? String(entityId) : null,
      metadata: metadata ?? null,
    },
  ];
  const opts = session ? { session } : {};
  const [row] = await Activity.create(docs, opts);
  return row;
}

export function serializeActivity(row, actor) {
  return {
    _id: String(row._id),
    groupId: String(row.groupId),
    actorId: String(row.actorId),
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    actor: actor
      ? {
          _id: String(actor._id),
          name: actor.name,
          email: actor.email,
          avatar: actor.avatar
            ? {
                url: actor.avatar.url ?? null,
                letters: actor.avatar.letters ?? null,
                bg: actor.avatar.bg ?? null,
              }
            : {
                url: actor.avatarUrl ?? null,
                letters: null,
                bg: actor.avatarColor ?? null,
              },
        }
      : null,
  };
}
