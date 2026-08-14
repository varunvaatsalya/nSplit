"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const METHODS = [
  { value: "EQUAL", label: "Equally" },
  { value: "EXACT", label: "As amount" },
  { value: "SHARES", label: "As parts" },
];

function memberLabel(m) {
  return m.displayName || m.user?.name || "Member";
}

function methodLabel(value) {
  return METHODS.find((m) => m.value === value)?.label || "Equally";
}

function defaultPartsMap(members, config) {
  const map = {};
  for (const m of members) map[m._id] = 1;
  if (Array.isArray(config)) {
    for (const row of config) {
      if (row?.memberId && map[row.memberId] != null) {
        const n = Number(row.value);
        map[row.memberId] = Number.isFinite(n) && n >= 1 ? Math.round(n) : 1;
      }
    }
  }
  return map;
}

export function GroupSettingsDialog({ group, open, onOpenChange, onUpdated }) {
  const router = useRouter();
  const [members, setMembers] = useState([]);
  const [method, setMethod] = useState("EQUAL");

  const [splitOpen, setSplitOpen] = useState(false);
  const [draftMethod, setDraftMethod] = useState("EQUAL");
  const [draftParts, setDraftParts] = useState({});
  const [savingSplit, setSavingSplit] = useState(false);
  const [splitError, setSplitError] = useState("");

  const [membersOpen, setMembersOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [invite, setInvite] = useState(false);
  const [permission, setPermission] = useState("ADD");
  const [memberError, setMemberError] = useState("");
  const [addingMember, setAddingMember] = useState(false);

  const [editName, setEditName] = useState("");
  const [editPermission, setEditPermission] = useState("ADD");
  const [editError, setEditError] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [confirmDeleteGroupOpen, setConfirmDeleteGroupOpen] = useState(false);
  const [confirmRemoveMemberOpen, setConfirmRemoveMemberOpen] = useState(false);

  useEffect(() => {
    if (!open || !group) return;
    const m = group.settings?.defaultSplitMethod;
    const nextMethod = ["EQUAL", "EXACT", "SHARES"].includes(m) ? m : "EQUAL";
    setMethod(nextMethod);
    setMembers(group.members || []);
    setSplitError("");
    setMemberError("");
    setDeleteError("");
    setSplitOpen(false);
    setMembersOpen(false);
    setAddOpen(false);
    setEditOpen(false);
  }, [open, group]);

  const splitHint = useMemo(() => {
    if (method !== "SHARES") return methodLabel(method);
    const config = group?.settings?.defaultSplitConfig;
    if (!Array.isArray(config) || !config.length) return "As parts";
    return "As parts · custom";
  }, [method, group?.settings?.defaultSplitConfig]);

  function openSplitEditor() {
    const current =
      ["EQUAL", "EXACT", "SHARES"].includes(method) ? method : "EQUAL";
    setDraftMethod(current);
    setDraftParts(
      defaultPartsMap(members, group?.settings?.defaultSplitConfig)
    );
    setSplitError("");
    setSplitOpen(true);
  }

  function setPart(memberId, next) {
    const n = Math.max(1, Math.min(99, next));
    setDraftParts((prev) => ({ ...prev, [memberId]: n }));
  }

  async function saveSplit() {
    if (!group?._id) return;
    setSavingSplit(true);
    setSplitError("");
    try {
      const body = {
        defaultSplitMethod: draftMethod,
        defaultSplitConfig:
          draftMethod === "SHARES"
            ? members.map((m) => ({
                memberId: m._id,
                value: Number(draftParts[m._id] || 1),
              }))
            : null,
      };
      const res = await fetch(`/api/groups/${group.code}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setSplitError(json?.error?.message || "Failed to save");
        return;
      }
      setMethod(draftMethod);
      setSplitOpen(false);
      onUpdated?.();
    } finally {
      setSavingSplit(false);
    }
  }

  async function addMember(e) {
    e.preventDefault();
    if (!group?._id) return;
    setAddingMember(true);
    setMemberError("");
    try {
      const res = await fetch(`/api/groups/${group.code}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim() || null,
          invite: Boolean(invite && email.trim()),
          permission: invite ? permission : "ADD",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMemberError(json?.error?.message || "Failed");
        return;
      }
      setName("");
      setEmail("");
      setInvite(false);
      setPermission("ADD");
      setAddOpen(false);
      if (json.data?.members) setMembers(json.data.members);
      else if (json.data?.member) {
        setMembers((prev) => [...prev, json.data.member]);
      }
      onUpdated?.();
    } finally {
      setAddingMember(false);
    }
  }

  function openEdit(member) {
    setEditing(member);
    setEditName(memberLabel(member));
    setEditPermission(
      ["VIEW_ONLY", "ADD", "EDIT", "ADMIN"].includes(member.permission)
        ? member.permission
        : "ADD"
    );
    setEditError("");
    setEditOpen(true);
  }

  async function saveEdit(e) {
    e.preventDefault();
    if (!group?._id || !editing) return;
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(
        `/api/groups/${group.code}/members/${editing._id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            displayName: editName.trim(),
            permission:
              editing.permission === "ADMIN" ? "ADMIN" : editPermission,
          }),
        }
      );
      const json = await res.json();
      if (!res.ok) {
        setEditError(json?.error?.message || "Failed to update");
        return;
      }
      if (json.data?.member) {
        setMembers((prev) =>
          prev.map((m) => (m._id === editing._id ? json.data.member : m))
        );
      }
      setEditOpen(false);
      setEditing(null);
      onUpdated?.();
    } finally {
      setSavingEdit(false);
    }
  }

  async function removeMember() {
    const member = editing;
    if (!group?._id || !member) return;
    if (member.permission === "ADMIN") {
      setEditError("Cannot remove the admin");
      return;
    }
    setSavingEdit(true);
    setEditError("");
    try {
      const res = await fetch(
        `/api/groups/${group.code}/members/${member._id}`,
        { method: "DELETE" }
      );
      const json = await res.json();
      if (!res.ok) {
        setEditError(json?.error?.message || "Failed to remove");
        setConfirmRemoveMemberOpen(false);
        return;
      }
      setMembers((prev) => prev.filter((m) => m._id !== member._id));
      setConfirmRemoveMemberOpen(false);
      setEditOpen(false);
      setEditing(null);
      onUpdated?.();
    } finally {
      setSavingEdit(false);
    }
  }

  async function deleteGroup() {
    if (!group?._id) return;
    setDeleting(true);
    setDeleteError("");
    try {
      const res = await fetch(`/api/groups/${group.code}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setDeleteError(json?.error?.message || "Failed to delete");
        setConfirmDeleteGroupOpen(false);
        return;
      }
      setConfirmDeleteGroupOpen(false);
      onOpenChange?.(false);
      router.push("/groups");
    } finally {
      setDeleting(false);
    }
  }

  if (!group) return null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,640px)] max-w-md flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription className="sr-only">
              Group settings.
            </DialogDescription>
          </DialogHeader>

          <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
            <div className="overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setMembersOpen(true)}
                className="flex w-full items-center gap-3 border-b border-border bg-surface px-3 py-3 text-left hover:bg-soft"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Members</div>
                  <div className="text-xs text-muted">
                    {members.length} member{members.length === 1 ? "" : "s"}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>

              <button
                type="button"
                onClick={openSplitEditor}
                className="flex w-full items-center gap-3 bg-surface px-3 py-3 text-left hover:bg-soft"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">Split method</div>
                </div>
                <span className="shrink-0 text-sm text-muted">{splitHint}</span>
                <ChevronRight className="h-4 w-4 text-muted" />
              </button>
            </div>

            <div className="mt-6 overflow-hidden rounded-xl border border-border">
              <button
                type="button"
                onClick={() => setConfirmDeleteGroupOpen(true)}
                disabled={deleting}
                className="flex w-full items-center gap-3 bg-surface px-3 py-3 text-left hover:bg-soft disabled:opacity-60"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-danger">
                    {deleting ? "Deleting…" : "Delete group"}
                  </div>
                  <div className="text-xs text-muted">
                    Permanent - cannot be undone
                  </div>
                </div>
                <Trash2 className="h-4 w-4 text-danger" />
              </button>
            </div>
            {deleteError ? (
              <p className="mt-2 text-sm text-danger">{deleteError}</p>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>

      {/* Split method picker */}
      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="flex max-h-[min(85vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle>Split method</DialogTitle>
            <DialogDescription>
              Default for new expenses in this group.
            </DialogDescription>
          </DialogHeader>

          <div className="nsplit-scroll min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
            <div className="space-y-2">
              {METHODS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setDraftMethod(m.value)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm",
                    draftMethod === m.value
                      ? "border-primary bg-soft"
                      : "border-border bg-background hover:bg-soft"
                  )}
                >
                  <span className="font-medium">{m.label}</span>
                  {draftMethod === m.value ? (
                    <span className="text-xs text-primary">Selected</span>
                  ) : null}
                </button>
              ))}
            </div>

            {draftMethod === "SHARES" ? (
              <div className="rounded-xl border border-border">
                <div className="border-b border-border px-3 py-2 text-xs font-medium text-muted">
                  Default parts per member
                </div>
                <ul className="divide-y divide-border">
                  {members.map((m) => {
                    const parts = draftParts[m._id] ?? 1;
                    return (
                      <li
                        key={m._id}
                        className="flex items-center gap-3 px-3 py-2.5"
                      >
                        <span className="min-w-0 flex-1 truncate text-sm font-medium">
                          {memberLabel(m)}
                        </span>
                        <div className="inline-flex items-center gap-1 rounded-md border border-border bg-soft px-1 py-0.5">
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted hover:text-foreground disabled:opacity-40"
                            disabled={parts <= 1}
                            onClick={() => setPart(m._id, parts - 1)}
                            aria-label="Decrease parts"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-8 text-center text-xs font-semibold tabular-nums">
                            {parts}x
                          </span>
                          <button
                            type="button"
                            className="rounded p-0.5 text-muted hover:text-foreground disabled:opacity-40"
                            disabled={parts >= 99}
                            onClick={() => setPart(m._id, parts + 1)}
                            aria-label="Increase parts"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}

            {splitError ? (
              <p className="text-sm text-danger">{splitError}</p>
            ) : null}
          </div>

          <DialogFooter className="shrink-0 border-t border-border p-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setSplitOpen(false)}
            >
              Cancel
            </Button>
            <Button type="button" onClick={saveSplit} disabled={savingSplit}>
              {savingSplit ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Members manager */}
      <Dialog open={membersOpen} onOpenChange={setMembersOpen}>
        <DialogContent className="flex max-h-[min(85vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle>Members</DialogTitle>
            <DialogDescription>
              Edit members or add someone new.
            </DialogDescription>
          </DialogHeader>

          <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <ul className="space-y-2">
              {members.map((m) => (
                <li
                  key={m._id}
                  className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">
                      {memberLabel(m)}
                    </div>
                    <div className="truncate text-xs text-muted">
                      {m.email || m.user?.email || "No email"}
                      {!m.userId ? " · guest" : ""}
                      {" · "}
                      {m.permission}
                    </div>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => openEdit(m)}
                    aria-label={`Edit ${memberLabel(m)}`}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>

          <div className="shrink-0 border-t border-border p-4">
            <Button
              type="button"
              className="w-full"
              onClick={() => {
                setName("");
                setEmail("");
                setInvite(false);
                setPermission("ADD");
                setMemberError("");
                setAddOpen(true);
              }}
            >
              Add member
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Add member form */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Name is enough - email is optional.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addMember} className="space-y-3">
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
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <Checkbox
                  checked={invite}
                  disabled={!email.trim()}
                  onCheckedChange={(v) => setInvite(Boolean(v))}
                />
                Invite
              </label>
              {invite ? (
                <Select value={permission} onValueChange={setPermission}>
                  <SelectTrigger className="h-8 w-28 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VIEW_ONLY">View only</SelectItem>
                    <SelectItem value="ADD">Add</SelectItem>
                    <SelectItem value="EDIT">Edit</SelectItem>
                  </SelectContent>
                </Select>
              ) : null}
            </div>
            {memberError ? (
              <p className="text-sm text-danger">{memberError}</p>
            ) : null}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setAddOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={addingMember}>
                {addingMember ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit member */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit member</DialogTitle>
            <DialogDescription>
              Update name or permission.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit} className="space-y-3">
            <Input
              required
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Display name"
            />
            {editing?.permission !== "ADMIN" ? (
              <Select value={editPermission} onValueChange={setEditPermission}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIEW_ONLY">View only</SelectItem>
                  <SelectItem value="ADD">Add</SelectItem>
                  <SelectItem value="EDIT">Edit</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <p className="text-xs text-muted">Admin permission is locked.</p>
            )}
            {editError ? <p className="text-sm text-danger">{editError}</p> : null}
            <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
              {editing?.permission !== "ADMIN" ? (
                <Button
                  type="button"
                  variant="outline"
                  className="border-danger text-danger"
                  disabled={savingEdit}
                  onClick={() => setConfirmRemoveMemberOpen(true)}
                >
                  Remove
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={savingEdit}>
                  {savingEdit ? "Saving…" : "Save"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteGroupOpen}
        onOpenChange={setConfirmDeleteGroupOpen}
        title="Delete group?"
        description={`“${group.name}” and its expenses will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete group"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={deleteGroup}
      />

      <ConfirmDialog
        open={confirmRemoveMemberOpen}
        onOpenChange={setConfirmRemoveMemberOpen}
        title="Remove member?"
        description={
          editing
            ? `${memberLabel(editing)} will be removed from this group.`
            : "This member will be removed from the group."
        }
        confirmLabel="Remove"
        cancelLabel="Cancel"
        loading={savingEdit}
        onConfirm={removeMember}
      />
    </>
  );
}
