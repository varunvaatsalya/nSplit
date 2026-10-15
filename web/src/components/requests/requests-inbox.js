"use client";

import { useEffect, useState } from "react";
import { Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RequestSummary } from "@/components/requests/request-summary";

/** "N requests waiting" banner for the group page. */
export function RequestsBanner({ count, onOpen }) {
  if (!count) return null;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="mb-5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-3 text-left transition-colors hover:bg-primary/10"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
        <Inbox className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-bold">
          {count} request{count === 1 ? "" : "s"} waiting for approval
        </span>
        <span className="block text-xs text-muted">Sent from your share link</span>
      </span>
      <span className="text-sm font-bold text-primary dark:text-primary-foreground">Review</span>
    </button>
  );
}

/** Review requests from the share link: approve adds the record, decline sends a reason back. */
export function RequestsInbox({ open, onOpenChange, group, onReviewed }) {
  const [requests, setRequests] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const byId = Object.fromEntries((group?.members || []).map((m) => [m._id, m]));
  const currency = group?.currency || "INR";

  useEffect(() => {
    if (!open || !group?.code) return;
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/groups/${group.code}/requests`);
      const json = await res.json().catch(() => null);
      if (!cancelled) setRequests(res.ok ? json.data.requests : []);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, group?.code]);

  async function review(request, action) {
    setBusyId(request._id);
    setError("");
    try {
      const res = await fetch(`/api/groups/${group.code}/requests/${request._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "reject" ? reason.trim() || null : null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok && res.status !== 409) {
        setError(json?.error?.message || "Could not update this request.");
        return;
      }
      setRequests((prev) => (prev || []).filter((r) => r._id !== request._id));
      setDeclining(null);
      setReason("");
      onReviewed?.();
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,760px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>Requests</DialogTitle>
          <DialogDescription>From people using this group&apos;s share link.</DialogDescription>
        </DialogHeader>
        <div className="nsplit-scroll min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain p-4">
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          {requests === null ? (
            <span className="block h-28 animate-pulse rounded-2xl bg-soft" />
          ) : requests.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">Nothing waiting. You&apos;re all caught up.</p>
          ) : (
            requests.map((r) => (
              <RequestSummary key={r._id} request={r} byId={byId} currency={currency} showSubmitter>
                {declining === r._id ? (
                  <div className="mt-3 space-y-2">
                    <Input
                      placeholder="Reason (optional), e.g. already added"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      maxLength={200}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1" onClick={() => setDeclining(null)}>
                        Back
                      </Button>
                      <Button
                        className="flex-1 bg-danger text-white"
                        disabled={busyId === r._id}
                        onClick={() => review(r, "reject")}
                      >
                        Decline
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      disabled={busyId === r._id}
                      onClick={() => {
                        setDeclining(r._id);
                        setReason("");
                      }}
                    >
                      Decline
                    </Button>
                    <Button className="flex-1" disabled={busyId === r._id} onClick={() => review(r, "approve")}>
                      {busyId === r._id ? "Adding…" : "Approve"}
                    </Button>
                  </div>
                )}
              </RequestSummary>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
