"use client";

import { useEffect, useState } from "react";

function NotificationsSkeleton() {
  return (
    <ul
      className="mt-6 space-y-2"
      aria-busy="true"
      aria-label="Loading notifications"
    >
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

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data?.notifications) setNotifications(json.data.notifications);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
      {loading ? (
        <NotificationsSkeleton />
      ) : (
        <ul className="mt-6 space-y-2">
          {notifications.length === 0 ? (
            <li className="text-sm text-muted">No notifications yet.</li>
          ) : (
            notifications.map((n) => (
              <li
                key={n.id}
                className="rounded-xl border border-border bg-surface px-4 py-3"
              >
                <div className="font-medium">{n.title}</div>
                {n.body ? (
                  <p className="mt-1 text-sm text-muted">{n.body}</p>
                ) : null}
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
