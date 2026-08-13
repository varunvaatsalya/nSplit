"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

/**
 * App-wide confirm modal (replaces window.confirm).
 * Use tone="danger" for destructive actions.
 * Pass confirmPhrase to require typing that text before confirm is enabled.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  tone = "danger",
  loading = false,
  confirmPhrase,
  onConfirm,
}) {
  const isDanger = tone === "danger";
  const [typed, setTyped] = useState("");

  useEffect(() => {
    if (open) setTyped("");
  }, [open]);

  const phrase = confirmPhrase?.trim() || "";
  const phraseOk =
    !phrase || typed.trim().toLowerCase() === phrase.toLowerCase();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (loading) return;
        onOpenChange?.(next);
      }}
    >
      <DialogContent
        showCloseButton={false}
        overlayClassName="z-[70]"
        className="z-70 max-w-sm gap-0 overflow-hidden p-0 sm:rounded-2xl"
        onOpenAutoFocus={(e) => {
          if (phrase) return;
          e.preventDefault();
        }}
      >
        <DialogHeader className="gap-3 px-5 pb-2 pt-5 pr-5">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-full",
              isDanger
                ? "bg-danger/10 text-danger"
                : "bg-primary/10 text-primary"
            )}
          >
            <AlertTriangle className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <DialogTitle className="text-base font-semibold tracking-tight">
              {title}
            </DialogTitle>
            {description ? (
              <DialogDescription className="text-sm leading-relaxed text-muted">
                {description}
              </DialogDescription>
            ) : null}
          </div>
        </DialogHeader>

        {phrase ? (
          <div className="px-5 pb-4">
            <label className="block space-y-1 text-sm">
              <div className="text-muted">
                Type{" "}
                <span className="font-medium text-foreground">{phrase}</span> to
                confirm.
              </div>
              <Input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                placeholder={phrase}
                autoComplete="off"
                spellCheck={false}
                disabled={loading}
              />
            </label>
          </div>
        ) : null}

        <DialogFooter className="gap-2 border-t border-border bg-soft/40 px-5 py-4 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1 sm:flex-none"
            disabled={loading}
            onClick={() => onOpenChange?.(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            className={cn(
              "flex-1 sm:flex-none",
              isDanger &&
                "bg-danger text-white hover:bg-danger/90 hover:opacity-100"
            )}
            disabled={loading || !phraseOk}
            onClick={() => onConfirm?.()}
          >
            {loading ? "Please wait…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
