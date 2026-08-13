"use client";

import { getGroupIcon } from "@/lib/group-options";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { UserAvatar } from "@/components/user-avatar";

const SPLIT_LABELS = {
  EQUAL: "Equally",
  EXACT: "As amount",
  SHARES: "As parts",
};

function memberLabel(m) {
  return m.displayName || m.user?.name || "Member";
}

export function GroupInfoDialog({ group, open, onOpenChange }) {
  if (!group) return null;

  const iconMeta = getGroupIcon(group.icon);
  const members = group.members || [];
  const splitMethod =
    SPLIT_LABELS[group.settings?.defaultSplitMethod] || "Equally";
  const partsConfig = Array.isArray(group.settings?.defaultSplitConfig)
    ? group.settings.defaultSplitConfig
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,640px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-4 pr-10">
          <DialogTitle className="sr-only">Group info</DialogTitle>
          <DialogDescription className="sr-only">
            Group details and members.
          </DialogDescription>
          <div className="flex items-center gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-soft text-2xl">
              {iconMeta.emoji}
            </span>
            <div className="min-w-0">
              <div className="truncate text-lg font-semibold tracking-tight">
                {group.name}
              </div>
              {group.description ? (
                <p className="mt-0.5 line-clamp-2 text-sm text-muted">
                  {group.description}
                </p>
              ) : (
                <p className="mt-0.5 text-sm text-muted">No description</p>
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="nsplit-scroll min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain px-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-soft px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Currency
              </div>
              <div className="mt-0.5 text-sm font-semibold">
                {group.currency || "INR"}
              </div>
            </div>
            <div className="rounded-xl bg-soft px-3 py-2.5">
              <div className="text-[10px] font-medium uppercase tracking-wide text-muted">
                Default split
              </div>
              <div className="mt-0.5 text-sm font-semibold">{splitMethod}</div>
              {group.settings?.defaultSplitMethod === "SHARES" &&
              partsConfig.length ? (
                <div className="mt-0.5 text-[11px] text-muted">
                  Custom parts set
                </div>
              ) : null}
            </div>
          </div>

          {group.createdAt ? (
            <div className="text-xs text-muted">
              Created{" "}
              {new Date(group.createdAt).toLocaleDateString(undefined, {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </div>
          ) : null}

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-sm font-semibold">Members</h3>
              <span className="text-xs text-muted">{members.length}</span>
            </div>
            <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
              {members.map((m) => {
                const label = memberLabel(m);
                const part = partsConfig.find((p) => p.memberId === m.id);
                return (
                  <li
                    key={m.id}
                    className="flex items-center gap-3 bg-surface px-3 py-2.5"
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
                        {!m.userId ? " · guest" : ""}
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="text-[10px] uppercase tracking-wide text-muted">
                        {m.permission === "ADMIN" ? "Admin" : m.permission}
                      </div>
                      {group.settings?.defaultSplitMethod === "SHARES" &&
                      part ? (
                        <div className="text-xs font-medium tabular-nums">
                          {part.value}x
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
              {!members.length ? (
                <li className="px-3 py-4 text-center text-sm text-muted">
                  No members
                </li>
              ) : null}
            </ul>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  );
}
