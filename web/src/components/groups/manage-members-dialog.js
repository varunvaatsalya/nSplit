"use client";

import { useEffect, useMemo, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/utils";

export const PERMISSION_OPTIONS = [
  { value: "VIEW_ONLY", label: "View only" },
  { value: "ADD", label: "Add" },
  { value: "EDIT", label: "Edit" },
  { value: "ADMIN", label: "Admin" },
];

const FORM_PERMISSION_OPTIONS = PERMISSION_OPTIONS.filter(
  (p) => p.value !== "ADMIN",
);

export function permissionLabel(value) {
  return PERMISSION_OPTIONS.find((p) => p.value === value)?.label || "Member";
}

function memberLabel(m) {
  return m.displayName || m.user?.name || "Member";
}

function adminCount(members) {
  return members.filter((m) => m.permission === "ADMIN").length;
}

function emptyForm() {
  return {
    name: "",
    email: "",
    invite: false,
    permission: "ADD",
  };
}

export function ManageMembersDialog({
  open,
  onOpenChange,
  groupId,
  members,
  currentUserId,
  onUpdated,
}) {
  const [mode, setMode] = useState(null);
  const [editing, setEditing] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(false);
  const [permission, setPermission] = useState("ADD");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [removing, setRemoving] = useState(null);

  useEffect(() => {
    if (!open) return;
    closePanel();
    setError("");
    setBusyId(null);
    setRemoving(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const lastAdminId = useMemo(() => {
    if (adminCount(members) !== 1) return null;
    return members.find((m) => m.permission === "ADMIN")?._id || null;
  }, [members]);

  function closePanel() {
    setMode(null);
    setEditing(null);
    const blank = emptyForm();
    setName(blank.name);
    setEmail(blank.email);
    setInvite(blank.invite);
    setPermission(blank.permission);
    setError("");
  }

  function openAdd() {
    setMode("add");
    setEditing(null);
    const blank = emptyForm();
    setName(blank.name);
    setEmail(blank.email);
    setInvite(blank.invite);
    setPermission(blank.permission);
    setError("");
  }

  function openEdit(member) {
    if (member.permission === "ADMIN") return;
    setMode("edit");
    setEditing(member);
    setName(memberLabel(member));
    setEmail(member.email || member.user?.email || "");
    setInvite(false);
    setPermission(
      FORM_PERMISSION_OPTIONS.some((p) => p.value === member.permission)
        ? member.permission
        : "ADD",
    );
    setError("");
  }

  async function addMember(e) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          invite: Boolean(invite && email.trim()),
          permission,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to add member");
        return;
      }
      closePanel();
      await onUpdated?.();
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError("");
    try {
      const body = {
        displayName: name.trim(),
        email: email.trim() || null,
        permission,
      };
      const res = await fetch(`/api/groups/${groupId}/members/${editing._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to update member");
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
      const res = await fetch(`/api/groups/${groupId}/members/${removing._id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to remove member");
        setRemoving(null);
        return;
      }
      const removedSelf =
        currentUserId &&
        removing.userId &&
        String(removing.userId) === String(currentUserId);
      if (editing?._id === removing._id) closePanel();
      setRemoving(null);
      if (removedSelf) {
        onOpenChange?.(false);
      }
      await onUpdated?.({ removedSelf });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(85vh,640px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle>Manage members</DialogTitle>
            <DialogDescription>
              Add someone, edit details, or remove them.
            </DialogDescription>
          </DialogHeader>

          <div className="nsplit-scroll min-h-0 flex-1 space-y-2 overflow-y-auto px-4 py-3">
            {members.map((m) => {
              const label = memberLabel(m);
              const isLastAdmin = lastAdminId === m._id;
              const busy = busyId === m._id;
              const selected = editing?._id === m._id;
              return (
                <div
                  key={m._id}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2.5",
                    selected ? "border-primary bg-primary/5" : "border-border",
                  )}
                >
                  <UserAvatar
                    className="h-9 w-9"
                    name={label}
                    avatar={m.avatar || m.user?.avatar}
                    seed={m.userId || m._id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-muted">
                      {m.email || m.user?.email || "No email"}
                      {!m.userId ? " · guest" : ""}
                      {" · "}
                      {permissionLabel(m.permission)}
                    </div>
                  </div>
                  <div className="flex items-center">
                    {m.permission === "ADMIN" ? null : (
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
                    )}
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="shrink-0 text-muted hover:bg-danger/10 hover:text-danger"
                      disabled={busy || isLastAdmin}
                      onClick={() => setRemoving(m)}
                      aria-label={`Remove ${label}`}
                      title={
                        isLastAdmin
                          ? "Group needs at least one admin"
                          : "Remove"
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {mode ? (
            <form
              onSubmit={mode === "edit" ? saveEdit : addMember}
              className="shrink-0 space-y-3 border-t border-border px-4 py-3"
            >
              <div className="text-sm font-medium">
                {mode === "edit" ? "Edit member" : "Add member"}
              </div>
              <Input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name / nickname"
                autoFocus
              />
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (!e.target.value.trim()) setInvite(false);
                  }}
                  placeholder="Email (optional)"
                  className="min-w-0 flex-1"
                />
                {mode === "add" ? (
                  <label className="flex items-center gap-1.5 text-xs text-muted">
                    <Checkbox
                      checked={invite}
                      disabled={!email.trim()}
                      onCheckedChange={(v) => setInvite(Boolean(v))}
                    />
                    Invite
                  </label>
                ) : null}
              </div>
              <Select value={permission} onValueChange={setPermission}>
                <SelectTrigger className="h-8 w-29 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FORM_PERMISSION_OPTIONS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={closePanel}
                  disabled={saving}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={saving || !name.trim()}
                >
                  {saving
                    ? mode === "edit"
                      ? "Saving…"
                      : "Adding…"
                    : mode === "edit"
                      ? "Save"
                      : "Add"}
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
            ? `“${memberLabel(removing)}” will be removed from this group.`
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
