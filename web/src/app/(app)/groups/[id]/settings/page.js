"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ChevronRight, Minus, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  ManageMembersDialog,
  permissionLabel,
} from "@/components/groups/manage-members-dialog";
import { EmojiPicker } from "@/components/emoji-picker";
import {
  CURRENCIES,
  getGroupIcon,
} from "@/lib/group-options";
import { cn } from "@/lib/utils";
import { Actions, can } from "@/shared/permissions";
import { memberListLabel, sortMembersByName } from "@/lib/members";

const METHODS = [
  { value: "EQUAL", label: "Equally" },
  { value: "EXACT", label: "As amount" },
  { value: "SHARES", label: "As parts" },
];

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

function Pulse({ className }) {
  return (
    <span
      className={cn("block animate-pulse rounded-md bg-muted-foreground/15", className)}
    />
  );
}

function SettingsPageSkeleton({ groupId }) {
  return (
    <div className="pb-16" aria-busy="true" aria-label="Loading settings">
      <div className="mb-6 flex items-center gap-3">
        <Button type="button" size="icon" variant="ghost" asChild>
          <Link href={`/groups/${groupId}`} aria-label="Back">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
      </div>

      <div className="space-y-5">
        <Card>
          <CardHeader>
            <Pulse className="h-3 w-24" />
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <Pulse className="h-12 w-12 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1 space-y-2">
                <Pulse className="h-9 w-full rounded-lg" />
                <Pulse className="h-14 w-full rounded-lg" />
              </div>
            </div>
            <div className="flex justify-end">
              <Pulse className="h-8 w-24 rounded-lg" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Pulse className="h-3 w-20" />
          </CardHeader>
          <CardContent className="space-y-1 p-2 pt-0">
            <div className="flex items-center justify-between rounded-xl px-3 py-3">
              <Pulse className="h-4 w-20" />
              <Pulse className="h-4 w-28" />
            </div>
            <div className="flex items-center justify-between rounded-xl px-3 py-3">
              <Pulse className="h-4 w-36" />
              <Pulse className="h-4 w-16" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <Pulse className="h-3 w-16" />
          </CardHeader>
          <CardContent className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
              >
                <Pulse className="h-9 w-9 shrink-0 rounded-full" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Pulse className="h-4 w-28" />
                  <Pulse className="h-3 w-36" />
                </div>
                <Pulse className="h-5 w-12 rounded-full" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function GroupSettingsPage() {
  const { id } = useParams();
  const router = useRouter();
  const [group, setGroup] = useState(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("users");
  const [iconsOpen, setIconsOpen] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [savingDetails, setSavingDetails] = useState(false);
  const [savingIcon, setSavingIcon] = useState(false);

  const [method, setMethod] = useState("EQUAL");
  const [splitOpen, setSplitOpen] = useState(false);
  const [draftMethod, setDraftMethod] = useState("EQUAL");
  const [draftParts, setDraftParts] = useState({});
  const [savingSplit, setSavingSplit] = useState(false);

  const [currencyOpen, setCurrencyOpen] = useState(false);
  const [members, setMembers] = useState([]);
  const [me, setMe] = useState(null);
  const [manageOpen, setManageOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  async function load() {
    const [gRes, meRes] = await Promise.all([
      fetch(`/api/groups/${id}`),
      fetch("/api/auth/me"),
    ]);
    const [json, meJson] = await Promise.all([gRes.json(), meRes.json()]);
    if (!gRes.ok) {
      setError(json?.error?.message || "Failed to load");
      return;
    }
    const g = json.data.group;
    setGroup(g);
    setName(g.name || "");
    setDescription(g.description || "");
    setIcon(g.icon || "users");
    setCurrency(g.currency || "INR");
    const m = g.settings?.defaultSplitMethod;
    setMethod(["EQUAL", "EXACT", "SHARES"].includes(m) ? m : "EQUAL");
    setMembers(sortMembersByName(g.members || []));
    if (meRes.ok) setMe(meJson.data.user);
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

  const myPermission = useMemo(() => {
    if (!me?._id) return null;
    return (
      members.find((m) => m.userId && String(m.userId) === String(me._id))
        ?.permission || null
    );
  }, [members, me]);

  const sortedMembers = useMemo(
    () => sortMembersByName(members),
    [members],
  );

  const canManageMembers = can(myPermission, Actions.MANAGE_MEMBERS);
  const canManageSettings = can(myPermission, Actions.MANAGE_SETTINGS);
  const canDeleteGroup =
    Boolean(me?._id && group?.createdById) &&
    String(group.createdById) === String(me._id);

  async function saveDetails() {
    if (!group) return;
    setSavingDetails(true);
    try {
      const res = await fetch(`/api/groups/${group.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
          icon,
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
    setDraftParts(
      defaultPartsMap(members, group?.settings?.defaultSplitConfig),
    );
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
                  memberId: m._id,
                  value: Number(draftParts[m._id] || 1),
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

  async function pickIcon(item) {
    const next = item.emoji;
    const prev = icon;
    setIcon(next);
    if (!group || next === prev) return;
    setSavingIcon(true);
    try {
      const res = await fetch(`/api/groups/${group.code}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ icon: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setIcon(prev);
        setError(json?.error?.message || "Failed to update icon");
      }
    } catch {
      setIcon(prev);
      setError("Failed to update icon");
    } finally {
      setSavingIcon(false);
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
  if (!group) return <SettingsPageSkeleton groupId={id} />;

  const iconMeta = getGroupIcon(icon);

  return (
    <div className="pb-16">
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
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => canManageSettings && setIconsOpen(true)}
                disabled={!canManageSettings || savingIcon}
                className={cn(
                  "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-soft text-2xl",
                  canManageSettings &&
                    "cursor-pointer hover:bg-muted-foreground/15",
                  !canManageSettings && "cursor-default"
                )}
                aria-label="Change group icon"
                title={canManageSettings ? "Change icon" : undefined}
              >
                {iconMeta.emoji}
              </button>
              <div className="min-w-0 flex-1 space-y-2">
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Group name"
                  disabled={!canManageSettings}
                />
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="What is this group for?"
                  className="min-h-14"
                  disabled={!canManageSettings}
                />
              </div>
            </div>
            {canManageSettings ? (
              <div className="flex justify-end">
                <Button
                  type="button"
                  size="sm"
                  onClick={saveDetails}
                  disabled={savingDetails || !name.trim()}
                >
                  {savingDetails ? "Saving…" : "Save details"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
              Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="p-2">
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
            {canManageMembers ? (
              <Button
                type="button"
                variant="link"
                className="h-auto px-2 py-0 text-xs text-primary dark:text-primary-foreground hover:text-primary/80 cursor-pointer"
                onClick={() => setManageOpen(true)}
              >
                Manage
              </Button>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-2">
            {sortedMembers.map((m) => {
              const label = memberListLabel(m, me?._id);
              const part =
                partsConfig.find((p) => p.memberId === m._id)?.value || 1;
              const pct =
                method === "SHARES"
                  ? Math.round((Number(part) / totalParts) * 100)
                  : Math.round(100 / Math.max(members.length, 1));
              return (
                <div
                  key={m._id}
                  className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
                >
                  <UserAvatar
                    name={label}
                    avatar={m.avatar || m.user?.avatar}
                    seed={m.userId || m._id}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{label}</div>
                    <div className="truncate text-xs text-muted">
                      {m.email || m.user?.email || "No email"}
                    </div>
                  </div>
                  <Badge
                    variant={m.permission === "ADMIN" ? "default" : "secondary"}
                  >
                    {permissionLabel(m.permission)}
                  </Badge>
                  <div className="hidden text-right text-[11px] text-muted sm:block">
                    <div>{method === "SHARES" ? `${part} Part` : "Equal"}</div>
                    <div>{pct}% Share</div>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {canDeleteGroup ? (
          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-danger">
                Danger zone
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Permanently delete this group and all of its expenses. This
                cannot be undone.
              </p>
              <Button
                type="button"
                variant="outline"
                className="shrink-0 border-danger text-danger hover:bg-danger/10 hover:text-danger"
                disabled={deleting}
                onClick={() => setConfirmDeleteOpen(true)}
              >
                Delete group
              </Button>
            </CardContent>
          </Card>
        ) : null}
      </div>

      <EmojiPicker
        open={iconsOpen}
        onOpenChange={setIconsOpen}
        value={getGroupIcon(icon).emoji}
        onSelect={pickIcon}
        description="Tap an emoji for this group."
      />

      <Dialog open={currencyOpen} onOpenChange={setCurrencyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Currency</DialogTitle>
            <DialogDescription>
              Default currency for this group.
            </DialogDescription>
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
                    : "border-border hover:bg-soft",
                )}
              >
                <span className="font-medium">{m.label}</span>
                {draftMethod === m.value ? (
                  <span className="text-xs text-primary dark:text-primary-foreground">
                    Selected
                  </span>
                ) : null}
              </button>
            ))}
          </div>
          {draftMethod === "SHARES" ? (
            <SharesEditor
              members={sortedMembers}
              currentUserId={me?._id}
              draftParts={draftParts}
              setDraftParts={setDraftParts}
            />
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

      <ManageMembersDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        groupId={id}
        members={members}
        currentUserId={me?._id}
        onUpdated={async ({ removedSelf } = {}) => {
          if (removedSelf) {
            router.push("/groups");
            return;
          }
          await load();
        }}
      />

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={setConfirmDeleteOpen}
        title="Delete this group?"
        description={`“${group.name}” and all of its expenses will be permanently removed. This cannot be undone.`}
        confirmLabel="Delete group"
        cancelLabel="Cancel"
        confirmPhrase="delete this group"
        loading={deleting}
        onConfirm={deleteGroup}
      />
    </div>
  );
}

function SharesEditor({ members, currentUserId, draftParts, setDraftParts }) {
  const totalParts =
    members.reduce((sum, m) => sum + (Number(draftParts[m._id]) || 1), 0) || 1;

  return (
    <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
      {members.map((m) => {
        const parts = draftParts[m._id] ?? 1;
        const pct = Math.round((parts / totalParts) * 100);
        const label = memberListLabel(m, currentUserId);
        return (
          <li
            key={m._id}
            className="flex items-center justify-between gap-3 px-3 py-2.5"
          >
            <span className="min-w-0 flex-1 truncate text-sm font-medium">
              {label}
            </span>
            <div className="flex shrink-0 items-center gap-2">
              <span className="w-11 text-right text-xs font-medium tabular-nums text-muted">
                {pct}%
              </span>
              <div className="inline-flex items-center gap-1 rounded-md border border-border bg-soft px-1">
                <button
                  type="button"
                  disabled={parts <= 1}
                  onClick={() =>
                    setDraftParts((p) => ({
                      ...p,
                      [m._id]: Math.max(1, parts - 1),
                    }))
                  }
                  className="p-1 text-muted disabled:opacity-40"
                  aria-label={`Decrease parts for ${label}`}
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="min-w-8 text-center text-xs font-semibold tabular-nums">
                  {parts}x
                </span>
                <button
                  type="button"
                  disabled={parts >= 99}
                  onClick={() =>
                    setDraftParts((p) => ({
                      ...p,
                      [m._id]: Math.min(99, parts + 1),
                    }))
                  }
                  className="p-1 text-muted disabled:opacity-40"
                  aria-label={`Increase parts for ${label}`}
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
