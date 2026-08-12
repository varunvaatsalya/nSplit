import { connectDb, idOf } from "@/lib/db";
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
    id: idOf(row),
    groupId: String(row.groupId),
    actorId: String(row.actorId),
    action: row.action,
    entityType: row.entityType,
    entityId: row.entityId,
    metadata: row.metadata,
    createdAt: row.createdAt,
    actor: actor
      ? {
          id: idOf(actor),
          name: actor.name,
          email: actor.email,
          avatarUrl: actor.avatarUrl ?? null,
        }
      : null,
  };
}
