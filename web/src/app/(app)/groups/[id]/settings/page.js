"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { UserAvatar } from "@/components/user-avatar";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { getGroupIcon } from "@/lib/group-options";
import { CURRENCIES } from "@/lib/group-options";
import { cn } from "@/lib/utils";

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
  for (const m of members) map[m.id] = 1;
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

export default function GroupSettingsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [currency, setCurrency] = useState("INR");
  const [savingDetails, setSavingDetails] = useState(false);

  const [method, setMethod] = useState("EQUAL");
  const [splitOpen, setSplitOpen] = useState(false);
  const [draftMethod, setDraftMethod] = useState("EQUAL");
  const [draftParts, setDraftParts] = useState({});
  const [savingSplit, setSavingSplit] = useState(false);

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [addOpen, setAddOpen] = useState(false);
  const [memberName, setMemberName] = useState("");
  const [memberEmail, setMemberEmail] = useState("");
  const [invite, setInvite] = useState(false);
  const [permission, setPermission] = useState("ADD");
  const [memberError, setMemberError] = useState("");
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function load() {
    const res = await fetch(`/api/groups/${id}`);
    const json = await res.json();
    if (!res.ok) {
      setError(json?.error?.message || "Failed to load");
      return;
    }
    const g = json.data.group;
    setGroup(g);
    setName(g.name || "");
    setDescription(g.description || "");
    setCurrency(g.currency || "INR");
    const m = g.settings?.defaultSplitMethod;
    setMethod(["EQUAL", "EXACT", "SHARES"].includes(m) ? m : "EQUAL");
    setMembers(g.members || []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const partsConfig = useMemo(() => {
    return Array.isArray(group?.settings?.defaultSplitConfig)
      ? group.settings.defaultSplitConfig
      : [];
  }, [group]);

  const totalParts = useMemo(() => {
    if (method !== "SHARES") return members.length || 1;
    if (!partsConfig.length) return members.length || 1;
    return partsConfig.reduce((s, p) => s + (Number(p.value) || 1), 0) || 1;
  }, [method, partsConfig, members.length]);

  async function saveDetails() {
    if (!group) return;
    setSavingDetails(true);
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          currency,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to save");
        return;
      }
      await load();
    } finally {
      setSavingDetails(false);
    }
  }

  function openSplit() {
    setDraftMethod(method);
    setDraftParts(defaultPartsMap(members, group?.settings?.defaultSplitConfig));
    setSplitOpen(true);
  }

  async function saveSplit() {
    setSavingSplit(true);
    try {
      const res = await fetch(`/api/groups/${id}/settings`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultSplitMethod: draftMethod,
          defaultSplitConfig:
            draftMethod === "SHARES"
              ? members.map((m) => ({
                  memberId: m.id,
                  value: Number(draftParts[m.id] || 1),
                }))
              : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to save split");
        return;
      }
      setMethod(draftMethod);
      setSplitOpen(false);
      await load();
    } finally {
      setSavingSplit(false);
    }
  }

  async function addMember(e) {
    e.preventDefault();
    setAdding(true);
    setMemberError("");
    try {
      const res = await fetch(`/api/groups/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: memberName.trim(),
          email: memberEmail.trim() || null,
          invite: Boolean(invite && memberEmail.trim()),
          permission: invite ? permission : "ADD",
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMemberError(json?.error?.message || "Failed");
        return;
      }
      setAddOpen(false);
      setMemberName("");
      setMemberEmail("");
      setInvite(false);
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function deleteGroup() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/groups/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to delete");
        setConfirmDeleteOpen(false);
        return;
      }
      setConfirmDeleteOpen(false);
      router.push("/groups");
    } finally {
      setDeleting(false);
    }
  }

  if (error && !group) return <p className="text-danger">{error}</p>;
  if (!group) return <p className="text-sm text-muted">Loading…</p>;

  const iconMeta = getGroupIcon(group.icon);

  return (
    <div className="mx-auto max-w-2xl pb-16">
      <div className="mb-6 flex items-center gap-3">
        <Button type="button" size="icon" variant="ghost" asChild>
          <Link href={`/groups/${id}`} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      {error ? <p className="mb-4 text-sm text-danger">{error}</p> : null}

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Group details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col items-center gap-2 py-2">
              <span className="flex h-20 w-20 items-center justify-center rounded-full bg-soft text-3xl">
                {iconMeta.emoji}
              </span>
              <span className="text-xs text-muted">Group icon</span>
            </div>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="block space-y-1.5 text-sm">
              <span className="text-muted">Description</span>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                placeholder="What is this group for?"
              />
            </label>
            <Button
              type="button"
              onClick={saveDetails}
              disabled={savingDetails || !name.trim()}
            >
              {savingDetails ? "Saving…" : "Save details"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            <button
              type="button"
              onClick={() => setCurrencyOpen(true)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-soft"
            >
              <span className="text-sm">Currency</span>
              <span className="flex items-center gap-1 text-sm text-muted">
                {CURRENCIES.find((c) => c.code === currency)?.label || currency}
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
            <button
              type="button"
              onClick={openSplit}
              className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left hover:bg-soft"
            >
              <span className="text-sm">Default split method</span>
              <span className="flex items-center gap-1 text-sm text-muted">
                {methodLabel(method)}
                <ChevronRight className="h-4 w-4" />
              </span>
            </button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Members
            </CardTitle>
            <Button
              type="button"
              variant="link"
              className="h-auto p-0 text-xs"
              onClick={() => setAddOpen(true)}
            >
              + Add Member
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {members.map((m) => {
              const label = memberLabel(m);
              const part =
                partsConfig.find((p) => p.memberId === m.id)?.value || 1;
              const pct =
                method === "SHARES"
                  ? Math.round((Number(part) / totalParts) * 100)
                  : Math.round(100 / Math.max(members.length, 1));
              return (
                <div
                  key={m.id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <UserAvatar
                    name={label}
                    avatar={m.avatar || m.user?.avatar}
                    seed={m.userId || m.id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-muted">
                      {m.email || m.user?.email || "No email"}
                    </div>
                  </div>
                  <Badge
                    variant={
                      m.permission === "ADMIN" ? "default" : "secondary"
                    }
                  >
                    {m.permission === "ADMIN" ? "Admin" : "Member"}
                  </Badge>
                  <div className="hidden text-right text-[11px] text-muted sm:block">
                    <div>
                      {method === "SHARES" ? `${part} Part` : "Equal"}
                    </div>
                    <div>{pct}% Share</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex justify-center pt-2">
          <Button
            type="button"
            variant="ghost"
            className="text-danger hover:bg-danger/10 hover:text-danger"
            disabled={deleting}
            onClick={() => setConfirmDeleteOpen(true)}
          >
            {deleting ? "Deleting…" : "Delete Group"}
          </Button>
        </div>
      </div>

      <Dialog open={currencyOpen} onOpenChange={setCurrencyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Currency</DialogTitle>
            <DialogDescription>Default currency for this group.</DialogDescription>
          </DialogHeader>
          <Select
            value={currency}
            onValueChange={(v) => {
              setCurrency(v);
            }}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CURRENCIES.map((c) => (
                <SelectItem key={c.code} value={c.code}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button
              type="button"
              onClick={async () => {
                setCurrencyOpen(false);
                await saveDetails();
              }}
            >
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={splitOpen} onOpenChange={setSplitOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Split method</DialogTitle>
            <DialogDescription>
              Default for new expenses in this group.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            {METHODS.map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setDraftMethod(m.value)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-3 py-3 text-left text-sm",
                  draftMethod === m.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:bg-soft"
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
            <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
              {members.map((m) => {
                const parts = draftParts[m.id] ?? 1;
                return (
                  <li
                    key={m.id}
                    className="flex items-center justify-between gap-3 px-3 py-2.5"
                  >
                    <span className="text-sm font-medium">
                      {memberLabel(m)}
                    </span>
                    <div className="inline-flex items-center gap-1 rounded-md border border-border bg-soft px-1">
                      <button
                        type="button"
                        disabled={parts <= 1}
                        onClick={() =>
                          setDraftParts((p) => ({
                            ...p,
                            [m.id]: Math.max(1, parts - 1),
                          }))
                        }
                        className="p-1 text-muted disabled:opacity-40"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-8 text-center text-xs font-semibold">
                        {parts}x
                      </span>
                      <button
                        type="button"
                        disabled={parts >= 99}
                        onClick={() =>
                          setDraftParts((p) => ({
                            ...p,
                            [m.id]: Math.min(99, parts + 1),
                          }))
                        }
                        className="p-1 text-muted disabled:opacity-40"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
          <DialogFooter>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add member</DialogTitle>
            <DialogDescription>
              Name required · email optional
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={addMember} className="space-y-3">
            <Input
              required
              value={memberName}
              onChange={(e) => setMemberName(e.target.value)}
              placeholder="Name / nickname"
              autoFocus
            />
            <div className="flex flex-wrap items-center gap-2">
              <Input
                type="email"
                value={memberEmail}
                onChange={(e) => {
                  setMemberEmail(e.target.value);
                  if (!e.target.value.trim()) setInvite(false);
                }}
                placeholder="Email (optional)"
                className="min-w-0 flex-1"
              />
              <label className="flex items-center gap-1.5 text-xs text-muted">
                <Checkbox
                  checked={invite}
                  disabled={!memberEmail.trim()}
                  onCheckedChange={(v) => setInvite(Boolean(v))}
                />
                Invite
              </label>
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
              <Button type="submit" disabled={adding}>
                {adding ? "Adding…" : "Add"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete group?"
        description={`“${group.name}” and its expenses will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete group"
        cancelLabel="Cancel"
        loading={deleting}
        onConfirm={deleteGroup}
      />
    </div>
  );
}
