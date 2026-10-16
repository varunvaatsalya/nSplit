"use client";

import { useState } from "react";
import { Bug, Check, ChevronRight, Lightbulb, MessageSquare, MessageSquareWarning } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

const TYPES = [
  { key: "bug", label: "Bug", icon: Bug, placeholder: "What went wrong? What did you expect to happen?" },
  { key: "idea", label: "Idea", icon: Lightbulb, placeholder: "What would make nSplit better for you?" },
  { key: "other", label: "Other", icon: MessageSquare, placeholder: "Tell us anything." },
];

/**
 * "Send feedback" row + dialog. `source` and `groupRef` say where it was sent
 * from, so the report carries that context without asking the user.
 */
export function FeedbackButton({ source, groupRef = null, className }) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  function change(next) {
    setOpen(next);
    if (!next) {
      setType("bug");
      setMessage("");
      setSent(false);
      setError("");
    }
  }

  async function send(e) {
    e.preventDefault();
    if (message.trim().length < 3) {
      setError("Write a little more so we can understand.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message: message.trim(), source, groupRef, platform: "web" }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) {
        setError(json?.error?.message || "Could not send. Please try again.");
        return;
      }
      setSent(true);
    } catch {
      setError("Could not send. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  const current = TYPES.find((t) => t.key === type);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-soft",
          className
        )}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:text-indigo-300">
          <MessageSquareWarning className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Send feedback</span>
          <span className="block text-xs text-muted">Report a bug or suggest an improvement</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted" />
      </button>

      <Dialog open={open} onOpenChange={change}>
        <DialogContent className="max-w-md">
          {sent ? (
            <div className="flex flex-col items-center py-4 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
                <Check className="h-7 w-7" />
              </span>
              <DialogTitle className="mt-4 text-lg font-bold">Thanks for the feedback</DialogTitle>
              <DialogDescription className="mt-1 text-sm text-muted">We read every message.</DialogDescription>
              <Button className="mt-5" onClick={() => change(false)}>
                Done
              </Button>
            </div>
          ) : (
            <form onSubmit={send} className="space-y-4">
              <div>
                <DialogTitle className="text-lg font-bold">Send feedback</DialogTitle>
                <DialogDescription className="mt-1 text-sm text-muted">
                  Found a bug or have an idea? Tell us.
                </DialogDescription>
              </div>
              <div className="flex gap-2">
                {TYPES.map(({ key, label, icon: Icon }) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setType(key)}
                    className={cn(
                      "flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors",
                      type === key
                        ? "border-primary bg-primary/10 text-primary dark:text-indigo-300"
                        : "border-border text-muted hover:bg-soft"
                    )}
                    aria-pressed={type === key}
                  >
                    <Icon className="h-4 w-4" />
                    {label}
                  </button>
                ))}
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={current.placeholder}
                maxLength={2000}
                rows={5}
                autoFocus
                className="resize-none"
              />
              {error ? <p className="text-sm text-danger">{error}</p> : null}
              <div className="flex gap-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => change(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="flex-1" disabled={sending}>
                  {sending ? "Sending…" : "Send"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
