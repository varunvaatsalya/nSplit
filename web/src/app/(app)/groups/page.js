"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { UserAvatar } from "@/components/user-avatar";
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
import { EmojiPicker } from "@/components/emoji-picker";
import { DEFAULT_GROUP_EMOJI, suggestEmojiFromText } from "@/lib/emoji-icons";
import { CURRENCIES, getGroupIcon } from "@/lib/group-options";
import { cn } from "@/lib/utils";

function GroupsListSkeleton() {
  return (
    <ul className="space-y-3" aria-busy="true" aria-label="Loading groups">
      {Array.from({ length: 4 }).map((_, i) => (
        <li key={i}>
          <div className="flex items-center gap-4 rounded-2xl border border-border bg-surface px-4 py-4">
            <span className="h-12 w-12 shrink-0 animate-pulse rounded-full bg-muted-foreground/15" />
            <div className="min-w-0 flex-1 space-y-2">
              <span className="block h-5 w-40 animate-pulse rounded-md bg-muted-foreground/15" />
              <span className="block h-4 w-24 animate-pulse rounded-md bg-muted-foreground/10" />
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

function emptyMember() {
  return { name: "", email: "", invite: false, permission: "ADD" };
}

function contactMatchesRow(member, contact) {
  const email = contact.email?.trim().toLowerCase();
  const name = contact.name?.trim().toLowerCase();
  const mEmail = member.email?.trim().toLowerCase();
  const mName = member.name?.trim().toLowerCase();
  if (email && mEmail && email === mEmail) return true;
  if (name && mName && name === mName && (!email || !mEmail)) return true;
  return false;
}

function isContactTaken(members, contact, exceptIndex) {
  return members.some(
    (m, i) => i !== exceptIndex && contactMatchesRow(m, contact),
  );
}

function filterContactSuggestions(contacts, members, index, query) {
  const q = String(query || "")
    .trim()
    .toLowerCase();
  if (!q) return [];

  return contacts
    .filter((c) => {
      if (isContactTaken(members, c, index)) return false;
      const name = (c.name || "").toLowerCase();
      const email = (c.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    })
    .slice(0, 6);
}

export default function GroupsPage() {
  const [groups, setGroups] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState(DEFAULT_GROUP_EMOJI);
  const [iconManual, setIconManual] = useState(false);
  const [iconsOpen, setIconsOpen] = useState(false);
  const [currency, setCurrency] = useState("INR");
  const [members, setMembers] = useState([emptyMember()]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [suggestKey, setSuggestKey] = useState(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/groups");
    const json = await res.json();
    if (res.ok) setGroups(json.data.groups || []);
    setLoading(false);
  }

  async function loadContacts() {
    const res = await fetch("/api/contacts");
    const json = await res.json();
    if (res.ok) setContacts(json.data.contacts || []);
  }

  useEffect(() => {
    load();
    loadContacts();
  }, []);

  function applyNameSuggestion(nextName) {
    if (iconManual) return;
    setIcon(
      suggestEmojiFromText(nextName, { emoji: DEFAULT_GROUP_EMOJI }).emoji,
    );
  }

  function pickIcon(item) {
    setIcon(item.emoji);
    setIconManual(true);
  }

  function updateMember(index, patch) {
    setMembers((prev) =>
      prev.map((m, i) => (i === index ? { ...m, ...patch } : m)),
    );
  }

  function removeMember(index) {
    setMembers((prev) => prev.filter((_, i) => i !== index));
    setSuggestKey(null);
  }

  function applyContact(index, contact) {
    updateMember(index, {
      name: contact.name || "",
      email: contact.email || "",
      invite: Boolean(contact.email),
      permission: "ADD",
    });
    setSuggestKey(null);
  }

  function suggestionsFor(index, field) {
    const member = members[index];
    if (!member) return [];
    const query = field === "email" ? member.email : member.name;
    return filterContactSuggestions(contacts, members, index, query);
  }

  function resetForm() {
    setName("");
    setIcon(DEFAULT_GROUP_EMOJI);
    setIconManual(false);
    setIconsOpen(false);
    setCurrency("INR");
    setMembers([emptyMember()]);
    setSuggestKey(null);
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
      await Promise.all([load(), loadContacts()]);
    } catch {
      setError("Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Groups</h1>
          <p className="mt-1 text-sm text-muted">
            Manage your shared expenses and collaborative budgets.
          </p>
        </div>
        <Button
          type="button"
          onClick={() => setShowForm(true)}
          className={"cursor-pointer"}
        >
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
              <button
                type="button"
                onClick={() => setIconsOpen(true)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-soft text-lg hover:bg-background"
                aria-label="Choose group icon"
                title="Choose icon"
              >
                {getGroupIcon(icon).emoji}
              </button>
              <Input
                value={name}
                onChange={(e) => {
                  const next = e.target.value;
                  setName(next);
                  applyNameSuggestion(next);
                }}
                placeholder="Trip to Goa"
                required
              />
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
                  onClick={() => setMembers((prev) => [...prev, emptyMember()])}
                  className="text-sm text-primary dark:text-primary-foreground hover:text-primary/80 cursor-pointer"
                >
                  + Add
                </button>
              </div>

              {members.map((member, index) => {
                const nameKey = `${index}:name`;
                const emailKey = `${index}:email`;
                const nameSuggestions = suggestionsFor(index, "name");
                const emailSuggestions = suggestionsFor(index, "email");

                return (
                  <div
                    key={index}
                    className="space-y-2 rounded-lg border border-border p-2.5"
                  >
                    <MemberSuggestField
                      value={member.name}
                      placeholder="Name / nickname"
                      suggestions={nameSuggestions}
                      open={suggestKey === nameKey}
                      onOpenChange={(open) =>
                        setSuggestKey(open ? nameKey : null)
                      }
                      onChange={(next) => updateMember(index, { name: next })}
                      onPick={(contact) => applyContact(index, contact)}
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <MemberSuggestField
                        type="email"
                        value={member.email}
                        placeholder="Email (optional)"
                        className="min-w-0 flex-1"
                        suggestions={emailSuggestions}
                        open={suggestKey === emailKey}
                        onOpenChange={(open) =>
                          setSuggestKey(open ? emailKey : null)
                        }
                        onChange={(next) =>
                          updateMember(index, {
                            email: next,
                            invite: next.trim() ? member.invite : false,
                          })
                        }
                        onPick={(contact) => applyContact(index, contact)}
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
                );
              })}
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

      <EmojiPicker
        open={iconsOpen}
        onOpenChange={setIconsOpen}
        value={getGroupIcon(icon).emoji}
        onSelect={pickIcon}
        description="Tap an emoji for this group."
      />

      {loading ? (
        <GroupsListSkeleton />
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
              <li key={g._id}>
                <Link
                  href={`/groups/${g.code}`}
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

function MemberSuggestField({
  value,
  onChange,
  onPick,
  suggestions,
  open,
  onOpenChange,
  placeholder,
  type = "text",
  className,
  inputMode,
}) {
  const blurTimer = useRef(null);
  const show = open && suggestions.length > 0;

  useEffect(() => {
    return () => {
      if (blurTimer.current) clearTimeout(blurTimer.current);
    };
  }, []);

  return (
    <div className={cn("relative min-w-0", className)}>
      <Input
        type={type}
        inputMode={inputMode}
        value={value}
        placeholder={placeholder}
        autoComplete="off"
        onChange={(e) => {
          onChange(e.target.value);
          onOpenChange(true);
        }}
        onFocus={() => onOpenChange(true)}
        onBlur={() => {
          blurTimer.current = setTimeout(() => onOpenChange(false), 120);
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onOpenChange(false);
        }}
      />
      {show ? (
        <ul className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 max-h-48 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
          {suggestions.map((contact) => (
            <li key={contact.id}>
              <button
                type="button"
                className="flex w-full items-center gap-2 px-2.5 py-2 text-left text-sm hover:bg-soft"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onPick(contact);
                  onOpenChange(false);
                }}
              >
                <UserAvatar
                  className="h-7 w-7"
                  fallbackClassName="text-[10px]"
                  name={contact.name}
                  avatar={contact.avatar}
                  seed={contact.userId || contact.email || contact.name}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium">
                    {contact.name}
                  </span>
                  {contact.email ? (
                    <span className="block truncate text-xs text-muted">
                      {contact.email}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
