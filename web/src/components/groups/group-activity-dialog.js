"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function GroupActivityDialog({ groupId, open, onOpenChange }) {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !groupId) return;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/groups/${groupId}/activity`)
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.data?.activities) setActivities(json.data.activities);
        else setActivities([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, groupId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>Activity</DialogTitle>
          <DialogDescription className="sr-only">
            Recent group activity.
          </DialogDescription>
        </DialogHeader>

        <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          {loading ? (
            <ul className="space-y-2" aria-busy="true" aria-label="Loading activity">
              {Array.from({ length: 5 }).map((_, i) => (
                <li
                  key={i}
                  className="rounded-lg border border-border bg-background px-3 py-2.5"
                >
                  <span className="block h-4 w-44 animate-pulse rounded-md bg-muted-foreground/15" />
                  <span className="mt-2 block h-3 w-28 animate-pulse rounded-md bg-muted-foreground/10" />
                </li>
              ))}
            </ul>
          ) : activities.length === 0 ? (
            <p className="text-sm text-muted">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => (
                <li
                  key={a.id}
                  className="rounded-lg border border-border bg-background px-3 py-2.5 text-sm"
                >
                  <span className="font-medium">{a.actor?.name}</span>{" "}
                  <span className="text-muted">
                    {a.action.replaceAll("_", " ").toLowerCase()}
                  </span>
                  <div className="mt-1 text-xs text-muted">
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
