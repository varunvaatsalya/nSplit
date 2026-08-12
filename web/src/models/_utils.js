export const MemberPermission = ["VIEW_ONLY", "ADD", "EDIT", "ADMIN"];
export const InvitationStatus = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "REVOKED",
  "EXPIRED",
];
export const SplitMethod = ["EQUAL", "EXACT", "PERCENTAGE", "SHARES", "CUSTOM"];
export const ActivityAction = [
  "GROUP_CREATED",
  "GROUP_UPDATED",
  "MEMBER_ADDED",
  "MEMBER_REMOVED",
  "MEMBER_PERMISSION_CHANGED",
  "INVITATION_SENT",
  "INVITATION_ACCEPTED",
  "SETTINGS_CHANGED",
  "EXPENSE_CREATED",
  "EXPENSE_UPDATED",
  "EXPENSE_DELETED",
  "INCOME_CREATED",
  "INCOME_UPDATED",
  "INCOME_DELETED",
  "TRANSFER_CREATED",
  "TRANSFER_UPDATED",
  "TRANSFER_DELETED",
];
export const NotificationType = [
  "INVITATION",
  "EXPENSE",
  "TRANSFER",
  "MEMBER",
  "SYSTEM",
];
export const MutationStatus = [
  "PENDING",
  "APPLIED",
  "CONFLICT",
  "REJECTED",
  "DUPLICATE",
];

export function applyIdTransform(schema) {
  schema.set("toJSON", {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  });
  schema.set("toObject", {
    virtuals: true,
    versionKey: false,
    transform(_doc, ret) {
      ret.id = String(ret._id);
      delete ret._id;
      return ret;
    },
  });
}
