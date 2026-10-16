"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Turn the group's read-only share link on/off, copy it, or replace it. Admins only. */
export function ShareLinkCard({ groupCode }) {
  const [share, setShare] = useState(null);
  const [busy, setBusy] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const res = await fetch(`/api/groups/${groupCode}/share`);
      const json = await res.json().catch(() => null);
      if (cancelled) return;
      if (res.ok) setShare(json.data.share);
      else setError(json?.error?.message || "Could not load the share link");
    })();
    return () => {
      cancelled = true;
    };
  }, [groupCode]);

  async function change(kind) {
    setBusy(kind);
    setError("");
    try {
      const res = await fetch(`/api/groups/${groupCode}/share`, {
        method: kind === "off" ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: kind === "off" ? undefined : JSON.stringify({ rotate: kind === "rotate" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || "Could not update the link");
        return;
      }
      setShare(json.data.share);
      setConfirm(null);
    } finally {
      setBusy(null);
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(share.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Copy failed. Select the link and copy it by hand.");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">Share link</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {share === null && !error ? (
          <span className="block h-20 animate-pulse rounded-xl bg-soft" />
        ) : share?.url ? (
          <>
            <div className="flex items-center gap-2 text-xs font-bold text-success">
              <span className="h-2 w-2 rounded-full bg-success" />
              Link is on
            </div>
            <div className="flex gap-2">
              <input
                readOnly
                value={share.url}
                onFocus={(e) => e.target.select()}
                className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-soft px-3 text-sm outline-none"
                aria-label="Share link"
              />
              <Button type="button" size="sm" className="h-9" onClick={copy}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "Copied" : "Copy"}
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" asChild>
                <a href={share.url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open
                </a>
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirm("rotate")}>
                New link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => setConfirm("off")}
              >
                Turn off
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              A read-only ledger anyone in the group can open in a browser. No app or login needed.
            </p>
            <Button type="button" className="shrink-0" disabled={busy === "create"} onClick={() => change("create")}>
              <Link2 className="h-4 w-4" />
              {busy === "create" ? "Creating…" : "Create link"}
            </Button>
          </div>
        )}

        {error ? <p className="text-sm text-danger">{error}</p> : null}
      </CardContent>

      <ConfirmDialog
        open={confirm !== null}
        onOpenChange={(open) => !open && !busy && setConfirm(null)}
        title={confirm === "off" ? "Turn off the link?" : "Make a new link?"}
        description={
          confirm === "off"
            ? "Anyone with the current link loses access right away. You can turn sharing on again later."
            : "The current link stops working right away. Send the new one to your group."
        }
        confirmLabel={confirm === "off" ? "Turn off" : "New link"}
        cancelLabel="Cancel"
        tone={confirm === "off" ? "danger" : "default"}
        loading={busy === "off" || busy === "rotate"}
        onConfirm={() => change(confirm)}
      />
    </Card>
  );
}
