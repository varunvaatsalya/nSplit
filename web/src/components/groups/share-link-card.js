"use client";

import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Link2Off, RefreshCw } from "lucide-react";
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
            <p className="text-sm text-muted">Anyone with this link can view expenses and balances, and ask to join.</p>

            {/* The link as a quiet chip: readable, selectable, copy right next to it. */}
            <div className="flex items-center gap-2 rounded-xl border border-border bg-soft py-1 pl-3 pr-1">
              <Link2 className="h-4 w-4 shrink-0 text-muted" />
              <span className="min-w-0 flex-1 select-all truncate text-sm text-muted" title={share.url}>
                {share.url.replace(/^https?:\/\//, "")}
              </span>
              <Button type="button" size="sm" className="h-8 shrink-0" onClick={copy}>
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
                <RefreshCw className="h-4 w-4" />
                New link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-danger/40 text-danger hover:bg-danger/10 hover:text-danger"
                onClick={() => setConfirm("off")}
              >
                <Link2Off className="h-4 w-4" />
                Turn off
              </Button>
            </div>
            <p className="text-xs text-muted">
              To remove someone&apos;s view access, turn off the link or make a new one. Members who joined stay in the group.
            </p>
          </>
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-muted">
              Create a link so others can view expenses and balances in a browser, and ask to join.
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
            ? "People viewing with this link lose access right away. Members who joined keep their access. You can turn it on again later."
            : "The current link stops working, so people viewing with it lose access. Members who joined keep their access. Share the new link with your group."
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
