"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function NotificationsSkeleton() {
  return (
    <ul className="mt-6 space-y-2" aria-busy="true" aria-label="Loading notifications">
      {Array.from({ length: 4 }).map((_, i) => (
        <li
          key={i}
          className="rounded-xl border border-border bg-surface px-4 py-3"
        >
          <span className="block h-4 w-40 animate-pulse rounded-md bg-muted-foreground/15" />
          <span className="mt-2 block h-3.5 w-full max-w-xs animate-pulse rounded-md bg-muted-foreground/10" />
        </li>
      ))}
    </ul>
  );
}

function formatWhen(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data?.notifications) setNotifications(json.data.notifications);
        if (json.data?.invitations) setInvitations(json.data.invitations);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const inviteCards = useMemo(
    () =>
      invitations.filter((inv) =>
        ["PENDING", "EXPIRED", "ACCEPTED", "DECLINED"].includes(inv.status)
      ),
    [invitations]
  );

  const otherNotifications = useMemo(
    () => notifications.filter((n) => n.type !== "INVITATION"),
    [notifications]
  );

  async function act(invitationId, action) {
    setBusyId(invitationId);
    setErrors((prev) => {
      const next = { ...prev };
      delete next[invitationId];
      return next;
    });
    try {
      const res = await fetch(`/api/invitations/${invitationId}/${action}`, {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setErrors((prev) => ({
          ...prev,
          [invitationId]: json?.error?.message || "Something went wrong",
        }));
        if (json?.error?.code === "INVITE_EXPIRED") {
          setInvitations((prev) =>
            prev.map((inv) =>
              inv._id === invitationId ? { ...inv, status: "EXPIRED" } : inv
            )
          );
        }
        return;
      }
      const nextStatus = action === "accept" ? "ACCEPTED" : "DECLINED";
      const updated = json.data?.invitation;
      setInvitations((prev) =>
        prev.map((inv) =>
          inv._id === invitationId
            ? { ...inv, ...(updated || {}), status: updated?.status || nextStatus }
            : inv
        )
      );
    } catch {
      setErrors((prev) => ({
        ...prev,
        [invitationId]: "Something went wrong",
      }));
    } finally {
      setBusyId(null);
    }
  }

  const empty = !loading && inviteCards.length === 0 && otherNotifications.length === 0;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      {loading ? (
        <NotificationsSkeleton />
      ) : empty ? (
        <p className="mt-6 text-sm text-muted">No notifications yet.</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {inviteCards.map((inv) => {
            const pending = inv.status === "PENDING";
            const expired = inv.status === "EXPIRED";
            const accepted = inv.status === "ACCEPTED";
            const declined = inv.status === "DECLINED";
            const busy = busyId === inv._id;
            return (
              <li
                key={inv._id}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="font-medium">
                  {expired ? "Invitation expired" : "Group invitation"}
                </div>
                <p className="mt-1 text-sm text-muted">
                  {pending
                    ? `You were invited to “${inv.groupName}”. Accept to join the group.`
                    : expired
                      ? `The invite to “${inv.groupName}” expired. Ask a group admin to send a new one.`
                      : accepted
                        ? `You joined “${inv.groupName}”.`
                        : `You declined the invite to “${inv.groupName}”.`}
                </p>
                {errors[inv._id] ? (
                  <p className="mt-2 text-sm text-danger">{errors[inv._id]}</p>
                ) : null}
                {pending ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={busy}
                      onClick={() => act(inv._id, "accept")}
                    >
                      {busy ? "Saving…" : "Accept"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={busy}
                      onClick={() => act(inv._id, "decline")}
                    >
                      Decline
                    </Button>
                  </div>
                ) : accepted && inv.groupCode ? (
                  <Link
                    href={`/groups/${inv.groupCode}`}
                    className="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                  >
                    Open group
                  </Link>
                ) : null}
              </li>
            );
          })}

          {otherNotifications.map((n) => (
            <li
              key={n._id}
              className={cn(
                "rounded-xl border border-border bg-surface px-4 py-3",
                n.readAt && "opacity-80"
              )}
            >
              <div className="font-medium">{n.title}</div>
              {n.body ? (
                <p className="mt-1 text-sm text-muted">{n.body}</p>
              ) : null}
              {n.createdAt ? (
                <p className="mt-2 text-xs text-muted">{formatWhen(n.createdAt)}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
