"use client";

import { useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";
import { memberListLabel, sortMembersByName } from "@/lib/members";

/**
 * Two roles in the UI: Admin (adds and approves directly) and Member (joined via
 * the group link; views and sends things for approval). Older permission levels
 * (ADD/EDIT) still work and show as Member.
 */
export function permissionLabel(value) {
  return value === "ADMIN" ? "Admin" : "Member";
}

function memberLabel(m) {
  return m.displayName || m.user?.name || "Member";
}

function memberStatus(m) {
  if (!m.userId) return "Not joined yet";
  const email = m.email || m.user?.email;
  return `${email ? `${email} · ` : ""}${permissionLabel(m.permission)}`;
}

export function ManageMembersDialog({ open, onOpenChange, groupId, members, currentUserId, onUpdated }) {
  const sortedMembers = useMemo(() => sortMembersByName(members), [members]);
  const [mode, setMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [role, setRole] = useState("VIEW_ONLY");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [removing, setRemoving] = useState(null);

  const lastAdminId = useMemo(() => {
    const admins = members.filter((m) => m.permission === "ADMIN");
    return admins.length === 1 ? admins[0]._id : null;
  }, [members]);

  function closePanel() {
    setMode(null);
    setEditing(null);
    setName("");
    setRole("VIEW_ONLY");
    setError("");
  }

  // Start fresh next time it opens.
  function handleOpenChange(next) {
    if (!next) {
      closePanel();
      setBusyId(null);
      setRemoving(null);
    }
    onOpenChange?.(next);
  }

  function openAdd() {
    closePanel();
    setMode("add");
  }

  function openEdit(member) {
    setMode("edit");
    setEditing(member);
    setName(memberLabel(member));
    setRole(member.permission === "ADMIN" ? "ADMIN" : "VIEW_ONLY");
    setError("");
  }

  async function submit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const isEdit = mode === "edit" && editing;
      // Role only applies to people who joined with an account.
      const roleChanged =
        isEdit && editing.userId && role !== (editing.permission === "ADMIN" ? "ADMIN" : "VIEW_ONLY");
      const res = await fetch(
        isEdit ? `/api/groups/${groupId}/members/${editing._id}` : `/api/groups/${groupId}/members`,
        {
          method: isEdit ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isEdit ? { displayName: name.trim(), ...(roleChanged ? { permission: role } : {}) } : { name: name.trim() },
          ),
        },
      );
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || (isEdit ? "Failed to update member" : "Failed to add member"));
        return;
      }
      closePanel();
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  async function removeMember() {
    if (!removing) return;
    setBusyId(removing._id);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/members/${removing._id}`, { method: "DELETE" });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || "Failed to remove member");
        setRemoving(null);
        return;
      }
      const removedSelf = currentUserId && removing.userId && String(removing.userId) === String(currentUserId);
      if (editing?._id === removing._id) closePanel();
      setRemoving(null);
      if (removedSelf) handleOpenChange(false);
      await onUpdated?.({ removedSelf });
    } finally {
      setBusyId(null);
    }
  }

  const editingLastAdmin = editing && editing._id === lastAdminId;

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[min(85vh,640px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle>Manage members</DialogTitle>
            <DialogDescription>
              Add names, rename, or remove. People join by opening the group link and asking to join.
            </DialogDescription>
          </DialogHeader>

          <div className="nsplit-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {sortedMembers.map((m) => {
              const label = memberListLabel(m, currentUserId);
              const busy = busyId === m._id;
              return (
                <div
                  key={m._id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5",
                    editing?._id === m._id ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <UserAvatar className="h-9 w-9" name={label} avatar={m.avatar || m.user?.avatar} seed={m.userId || m._id} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-muted">{memberStatus(m)}</div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-muted hover:text-foreground"
                    disabled={busy}
                    onClick={() => openEdit(m)}
                    aria-label={`Edit ${label}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="shrink-0 text-muted hover:bg-danger/10 hover:text-danger"
                    disabled={busy || lastAdminId === m._id}
                    onClick={() => setRemoving(m)}
                    aria-label={`Remove ${label}`}
                    title={lastAdminId === m._id ? "Group needs at least one admin" : "Remove"}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            {error && !mode ? <p className="text-sm text-danger">{error}</p> : null}
          </div>

          {mode ? (
            <form onSubmit={submit} className="shrink-0 space-y-3 border-t border-border px-4 py-3">
              <div className="text-sm font-medium">{mode === "edit" ? "Edit member" : "Add member"}</div>
              <Input required value={name} onChange={(e) => setName(e.target.value)} placeholder="Name / nickname" autoFocus />
              {mode === "edit" && editing?.userId ? (
                <div>
                  <div className="inline-flex rounded-full bg-muted-foreground/10 p-1">
                    {[
                      ["VIEW_ONLY", "Member"],
                      ["ADMIN", "Admin"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        disabled={editingLastAdmin && value !== "ADMIN"}
                        onClick={() => setRole(value)}
                        className={cn(
                          "cursor-pointer rounded-full px-4 py-1 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                          role === value ? "bg-surface text-foreground shadow-sm" : "text-muted hover:text-foreground",
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-1.5 text-xs text-muted">
                    {editingLastAdmin
                      ? "The group needs at least one admin."
                      : role === "ADMIN"
                        ? "Admins add and edit directly, and approve requests."
                        : "Members see everything and send expenses for approval."}
                  </p>
                </div>
              ) : null}
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={closePanel} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={saving || !name.trim()}>
                  {saving ? (mode === "edit" ? "Saving…" : "Adding…") : mode === "edit" ? "Save" : "Add"}
                </Button>
              </div>
            </form>
          ) : (
            <div className="shrink-0 border-t border-border p-3">
              <Button type="button" className="w-full" onClick={openAdd}>
                Add member
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={Boolean(removing)}
        onOpenChange={(next) => {
          if (!next) setRemoving(null);
        }}
        title="Remove member?"
        description={
          removing
            ? `“${memberLabel(removing)}” will be removed from this group${removing.userId ? " and lose access to it" : ""}.`
            : "This member will be removed from the group."
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        loading={Boolean(removing && busyId === removing._id)}
        onConfirm={removeMember}
      />
    </>
  );
}
