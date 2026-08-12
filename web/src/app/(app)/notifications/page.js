"use client";

import { useEffect, useState } from "react";

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((json) => {
        if (json.data?.notifications) setNotifications(json.data.notifications);
      });
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
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
              {n.body ? <p className="mt-1 text-sm text-muted">{n.body}</p> : null}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}
