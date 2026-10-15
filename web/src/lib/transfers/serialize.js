import { toJSON } from "@/lib/db";

export function serializeTransfer(doc) {
  const t = toJSON(doc);
  t.groupId = String(t.groupId);
  t.fromMemberId = String(t.fromMemberId);
  t.toMemberId = String(t.toMemberId);
  t.createdById = String(t.createdById);
  return t;
}
