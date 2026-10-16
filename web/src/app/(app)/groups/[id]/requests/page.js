"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, Inbox } from "lucide-react";
import { RequestSummary } from "@/components/requests/request-summary";
import { GroupLoadError, groupErrorFrom } from "@/components/groups/group-load-error";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Requests for a group. Admins approve or decline join requests and suggested
 * expenses/payments; members follow the ones they sent.
 */
export default function GroupRequestsPage() {
  const { id } = useParams();
  const [group, setGroup] = useState(null);
  const [requests, setRequests] = useState(null);
  const [canReview, setCanReview] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [declining, setDeclining] = useState(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState(null);

  async function load() {
    const [gRes, rRes] = await Promise.all([fetch(`/api/groups/${id}`), fetch(`/api/groups/${id}/requests?status=all`)]);
    const [gJson, rJson] = await Promise.all([gRes.json(), rRes.json()]);
    if (!gRes.ok || !rRes.ok) {
      setLoadError(gRes.ok ? groupErrorFrom(rRes, rJson) : groupErrorFrom(gRes, gJson));
      return;
    }
    setLoadError(null);
    setGroup(gJson.data.group);
    setRequests(rJson.data.requests || []);
    setCanReview(Boolean(rJson.data.canReview));
  }

  useEffect(() => {
    // Loading from the API is the external system this effect syncs with.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function review(request, action) {
    setBusyId(request._id);
    setError("");
    try {
      const res = await fetch(`/api/groups/${id}/requests/${request._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, reason: action === "reject" ? reason.trim() || null : null }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok && res.status !== 409) {
        setError(json?.error?.message || "Could not update this request.");
        return;
      }
      setDeclining(null);
      setReason("");
      await load();
    } finally {
      setBusyId(null);
    }
  }

  const byId = Object.fromEntries((group?.members || []).map((m) => [m._id, m]));
  const currency = group?.currency || "INR";
  const pending = (requests || []).filter((r) => r.status === "PENDING");
  const reviewed = (requests || []).filter((r) => r.status !== "PENDING");
  const section = "mb-2 mt-6 text-[11px] font-bold uppercase tracking-[0.08em] text-muted";

  function actions(r) {
    if (!canReview || r.status !== "PENDING") return null;
    const busy = busyId === r._id;
    if (declining === r._id) {
      return (
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
            <Button className="flex-1 bg-danger text-white" disabled={busy} onClick={() => review(r, "reject")}>
              Decline
            </Button>
          </div>
        </div>
      );
    }
    return (
      <div className="mt-3 flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          disabled={busy}
          onClick={() => {
            setDeclining(r._id);
            setReason("");
          }}
        >
          Decline
        </Button>
        <Button className="flex-1" disabled={busy} onClick={() => review(r, "approve")}>
          {busy ? "Approving…" : r.kind === "join" ? "Approve join" : "Approve"}
        </Button>
      </div>
    );
  }

  if (loadError) return <GroupLoadError error={loadError} onRetry={load} />;

  return (
    <div className="pb-16">
      <div className="mb-4 flex items-center gap-2">
        <Button type="button" size="icon" variant="ghost" asChild>
          <Link href={`/groups/${id}`} aria-label="Back to group">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <h1 className="text-[22px] font-bold">{canReview ? "Requests" : "Your requests"}</h1>
      </div>
      <p className="text-sm text-muted">
        {canReview
          ? "People asking to join this group, and expenses or payments members sent for approval."
          : "Expenses and payments you sent. They're added to the group once an admin approves them."}
      </p>
      {error ? <p className="mt-3 text-sm text-danger">{error}</p> : null}

      {requests === null ? (
        <span className="mt-6 block h-28 animate-pulse rounded-2xl bg-soft" />
      ) : requests.length === 0 ? (
        <div className="mt-12 flex flex-col items-center text-center text-sm text-muted">
          <Inbox className="mb-2 h-8 w-8" />
          {canReview ? "Nothing waiting. You're all caught up." : "You haven't sent anything yet."}
        </div>
      ) : (
        <>
          {pending.length ? (
            <>
              <div className={section}>Waiting ({pending.length})</div>
              <div className="space-y-3">
                {pending.map((r) => (
                  <RequestSummary key={r._id} request={r} byId={byId} currency={currency} showSubmitter={canReview}>
                    {actions(r)}
                  </RequestSummary>
                ))}
              </div>
            </>
          ) : null}
          {reviewed.length ? (
            <>
              <div className={section}>Reviewed</div>
              <div className="space-y-3">
                {reviewed.map((r) => (
                  <RequestSummary key={r._id} request={r} byId={byId} currency={currency} showSubmitter={canReview} />
                ))}
              </div>
            </>
          ) : null}
        </>
      )}
    </div>
  );
}
