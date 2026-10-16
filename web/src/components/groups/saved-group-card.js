"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronRight, Link2Off, X } from "lucide-react";
import { getGroupIcon } from "@/lib/group-options";

/** A group added by link (view only), or its "link expired" placeholder. */
export function SavedGroupCard({ share, onRemoved }) {
  const [removing, setRemoving] = useState(false);
  const icon = getGroupIcon(share.icon).emoji;

  async function remove() {
    setRemoving(true);
    try {
      await fetch(`/api/shares/${share.token}`, { method: "DELETE" });
      onRemoved?.();
    } finally {
      setRemoving(false);
    }
  }

  if (share.status === "expired") {
    return (
      <div className="flex items-center gap-3.5 rounded-[18px] border border-dashed border-border bg-surface p-3.5">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-muted">
          <Link2Off className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-base font-bold text-muted">{share.name || "Shared group"}</div>
          <div className="text-[13px] text-danger">Link expired · ask for a new one</div>
        </div>
        <button
          type="button"
          onClick={remove}
          disabled={removing}
          className="flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-soft hover:text-danger"
          aria-label="Remove group"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  const status =
    share.join === "pending"
      ? "Join request sent"
      : `${share.memberCount || 0} member${share.memberCount === 1 ? "" : "s"}`;

  return (
    <Link
      href={`/s/${share.token}`}
      className="flex items-center gap-3.5 rounded-[18px] border border-border bg-surface p-3.5 transition-colors hover:border-primary/30 hover:bg-soft/40"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-soft text-[22px]">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-base font-bold">{share.name}</span>
          <span className="shrink-0 rounded-full bg-soft px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-muted">
            Viewer
          </span>
        </div>
        <div className="text-[13px] text-muted">{status}</div>
      </div>
      <ChevronRight className="h-5 w-5 shrink-0 text-muted" />
    </Link>
  );
}
