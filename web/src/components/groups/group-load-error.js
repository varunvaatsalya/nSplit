"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Lock, LogIn, RotateCw, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * What to show when a group page can't load, by the API's HTTP status:
 * 403 not a member · 404 not found · 401 signed out · anything else.
 */
const VARIANTS = {
  forbidden: {
    icon: Lock,
    tone: "bg-primary/10 text-primary dark:text-indigo-300",
    title: "You're not part of this group",
    body: "This group exists, but your account isn't one of its members. If someone shared the group link with you, open it to view the group and ask to join.",
  },
  missing: {
    icon: SearchX,
    tone: "bg-soft text-muted",
    title: "Group not found",
    body: "It may have been deleted, or the address is wrong.",
  },
  signedOut: {
    icon: LogIn,
    tone: "bg-soft text-muted",
    title: "Your session ended",
    body: "Log in again to see this group.",
  },
  failed: {
    icon: AlertTriangle,
    tone: "bg-danger/10 text-danger",
    title: "Couldn't load this group",
    body: "Check your connection and try again.",
  },
};

export function groupErrorFrom(res, json) {
  return { status: res.status, message: json?.error?.message || null };
}

export function GroupLoadError({ error, onRetry, className }) {
  const kind =
    error?.status === 403 ? "forbidden" : error?.status === 404 ? "missing" : error?.status === 401 ? "signedOut" : "failed";
  const v = VARIANTS[kind];
  const Icon = v.icon;

  return (
    <div className={cn("flex flex-col items-center px-4 py-16 text-center", className)} role="alert">
      <span className={cn("flex h-16 w-16 items-center justify-center rounded-full", v.tone)}>
        <Icon className="h-7 w-7" />
      </span>
      <h1 className="mt-4 text-xl font-bold">{v.title}</h1>
      <p className="mt-2 max-w-sm text-sm leading-6 text-muted">{v.body}</p>
      {kind === "failed" && error?.message ? <p className="mt-1 text-xs text-muted">{error.message}</p> : null}

      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {kind === "signedOut" ? (
          <Button asChild>
            <Link href="/login">
              <LogIn className="h-4 w-4" />
              Log in
            </Link>
          </Button>
        ) : (
          <Button asChild variant={kind === "failed" ? "outline" : "default"}>
            <Link href="/groups">
              <ArrowLeft className="h-4 w-4" />
              Back to my groups
            </Link>
          </Button>
        )}
        {kind === "failed" && onRetry ? (
          <Button onClick={onRetry}>
            <RotateCw className="h-4 w-4" />
            Try again
          </Button>
        ) : null}
      </div>
    </div>
  );
}
