/**
 * Adds `clientUpdatedAt`: when the record's content last changed, as seen by the
 * device that changed it. Sync uses it for last-write-wins.
 *
 * Sync writes set it explicitly (the device's time). Every other write (web routes,
 * invitations, ...) gets "now", so an older offline edit can never silently replace
 * a newer web edit. `updatedAt` (server time) stays the pull cursor.
 */
export function clientUpdatedAtPlugin(schema) {
  schema.add({ clientUpdatedAt: { type: Date, default: null } });

  schema.pre("save", function () {
    if (!this.isModified("clientUpdatedAt")) this.clientUpdatedAt = new Date();
  });

  schema.pre(["updateOne", "updateMany", "findOneAndUpdate"], function () {
    const update = this.getUpdate() || {};
    const explicit =
      update.clientUpdatedAt !== undefined || update.$set?.clientUpdatedAt !== undefined;
    if (!explicit) this.set("clientUpdatedAt", new Date());
  });
}
