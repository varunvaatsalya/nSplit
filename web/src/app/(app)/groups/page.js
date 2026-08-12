"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
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
import { CURRENCIES, GROUP_ICONS, getGroupIcon } from "@/lib/group-options";
import { cn } from "@/lib/utils";

function emptyMember() {
  return { name: "", email: "", invite: false, permission: "ADD" };
}

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("users");
  const [currency, setCurrency] = useState("INR");
  const [members, setMembers] = useState([emptyMember()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/groups");
    const json = await res.json();
    if (res.ok) setGroups(json.data.groups || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  function updateMember(index, patch) {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m))
    );
  }

  function removeMember(index) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
  }

  function resetForm() {
    setName("");
    setIcon("users");
    setCurrency("INR");
    setMembers([emptyMember()]);
    setError("");
  }

  async function createGroup(e) {
    e.preventDefault();
    setError("");
    setCreating(true);

    const cleaned = members
      .map((m) => ({
        name: m.name.trim(),
        email: m.email.trim() || null,
        invite: Boolean(m.invite),
        permission: m.invite ? m.permission : "ADD",
      }))
      .filter((m) => m.name);

    try {
      const res = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          icon,
          currency,
          members: cleaned,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error?.message || "Failed to create group");
        return;
      }
      resetForm();
      setShowForm(false);
      await load();
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your shared expenses and collaborative budgets.
          </p>
        </div>
        <Button type="button" onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4" />
          New group
        </Button>
      </div>

      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) resetForm();
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New group</DialogTitle>
            <DialogDescription>
              Pick an icon, add members, and start splitting.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={createGroup} className="space-y-4">
            <div className="flex gap-2">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-soft text-lg">
                {getGroupIcon(icon).emoji}
              </span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Trip to Goa"
                required
              />
            </div>

            <div className="flex flex-wrap gap-1.5">
              {GROUP_ICONS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  title={item.label}
                  onClick={() => setIcon(item.key)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-base",
                    icon === item.key
                      ? "border-primary bg-primary/10"
                      : "border-border bg-background hover:bg-soft"
                  )}
                >
                  {item.emoji}
                </button>
              ))}
            </div>

            <Select value={currency} onValueChange={setCurrency}>
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

            <div className="space-y-2 border-t border-border pt-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Members</span>
                <button
                  type="button"
                  onClick={() =>
                    setMembers((prev) => [...prev, emptyMember()])
                  }
                  className="text-xs text-primary"
                >
                  + Add
                </button>
              </div>
              {members.map((member, index) => (
                <div
                  key={index}
                  className="space-y-2 rounded-lg border border-border p-2.5"
                >
                  <Input
                    value={member.name}
                    onChange={(e) =>
                      updateMember(index, { name: e.target.value })
                    }
                    placeholder="Name / nickname"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <Input
                      type="email"
                      value={member.email}
                      onChange={(e) =>
                        updateMember(index, {
                          email: e.target.value,
                          invite: e.target.value.trim()
                            ? member.invite
                            : false,
                        })
                      }
                      placeholder="Email (optional)"
                      className="min-w-0 flex-1"
                    />
                    <label className="flex items-center gap-1.5 text-xs text-muted">
                      <Checkbox
                        checked={member.invite}
                        disabled={!member.email.trim()}
                        onCheckedChange={(v) =>
                          updateMember(index, { invite: Boolean(v) })
                        }
                      />
                      Invite
                    </label>
                    {members.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeMember(index)}
                        className="text-xs text-muted hover:text-danger"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>

            {error ? <p className="text-sm text-danger">{error}</p> : null}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowForm(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={creating || !name.trim()}>
                {creating ? "Creating…" : "Create group"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {loading ? (
        <p className="text-sm text-muted">Loading…</p>
      ) : groups.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-surface px-6 py-14 text-center">
          <p className="text-sm text-muted">No groups yet.</p>
          <Button
            type="button"
            variant="link"
            className="mt-1"
            onClick={() => setShowForm(true)}
          >
            Create your first group
          </Button>
        </div>
      ) : (
        <ul className="space-y-3">
          {groups.map((g) => {
            const iconMeta = getGroupIcon(g.icon);
            return (
              <li key={g.id}>
                <Link
                  href={`/groups/${g.id}`}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-4 transition-colors hover:border-primary/30 hover:bg-soft/40"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-xl">
                    {iconMeta.emoji}
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-base font-semibold tracking-tight">
                      {g.name}
                    </div>
                    <div className="text-sm text-muted">
                      {g.memberCount || 0} member
                      {(g.memberCount || 0) === 1 ? "" : "s"}
                    </div>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
