"use client";

import Link from "next/link";
import { UserAvatar } from "@/components/user-avatar";
import { Logo } from "@/components/brand/logo";

export function AppShell({ user, children }) {
  return (
    <div className="nsplit-backdrop min-h-screen">
      <div className="mx-auto flex flex-col items-center min-h-screen py-4 px-4 sm:px-6">
        <header className="w-full max-w-3xl flex shrink-0 items-center justify-between gap-3 px-4 sm:px-6">
          <Link href="/groups" className="min-w-0 flex items-center gap-2">
            <Logo className="h-5 w-5 text-primary" />
            <div className="text-xl font-bold tracking-tight text-primary">
              nSplit
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/profile"
              className="flex shrink-0 items-center gap-2 rounded-full transition-opacity hover:opacity-90"
              aria-label="Profile"
            >
              <UserAvatar
                className="h-9 w-9"
                name={user?.name}
                avatar={user?.avatar}
                seed={user?._id}
              />
            </Link>
          </div>
        </header>
        <div className="w-full border-b border-muted my-4" />

        <main className="w-full max-w-3xl min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
