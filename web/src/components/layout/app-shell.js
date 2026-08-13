"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";

export function AppShell({ user, children }) {
  return (
    <div className="min-h-screen bg-primary-foreground/60">
      <div className="mx-auto flex flex-col items-center min-h-screen py-4 px-4 sm:px-6">
        <header className="w-full max-w-3xl flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/groups" className="min-w-0">
            <div className="text-xl font-semibold tracking-tight text-primary">
              Nsplit
            </div>
          </Link>

          <Link
            href="/profile"
            className="flex shrink-0 items-center gap-2 rounded-full transition-opacity hover:opacity-90"
            aria-label="Profile"
          >
            <UserAvatar
              className="h-9 w-9"
              name={user?.name}
              avatar={user?.avatar}
              seed={user?.id}
            />
          </Link>
        </header>
        <div className="w-full border-b border-muted my-4" />

        <main className="w-full max-w-3xl min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
