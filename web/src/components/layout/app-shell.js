"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  LayoutDashboard,
  LogOut,
  Settings2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const primaryNav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/groups", label: "Groups", icon: Users },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function AppShell({ user, children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  function isActive(href) {
    if (href === "/groups") return pathname.startsWith("/groups");
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div className="min-h-screen bg-background md:flex">
      <aside className="hidden w-[220px] shrink-0 border-r border-border bg-surface md:flex md:flex-col">
        <div className="px-5 py-5">
          <Link href="/dashboard" className="block">
            <div className="text-lg font-semibold tracking-tight text-primary">
              Nsplit
            </div>
            <div className="text-[11px] text-muted">Expense Sharing</div>
          </Link>
        </div>

        <nav className="flex flex-1 flex-col gap-1 px-3">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-primary/10 font-medium text-primary"
                    : "text-muted hover:bg-soft hover:text-foreground"
                )}
              >
                {active ? (
                  <span className="absolute inset-y-1 right-0 w-0.5 rounded-l bg-primary" />
                ) : null}
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="space-y-1 p-3">
          <Separator className="mb-2" />
          <Link
            href="/profile"
            className="flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-muted hover:bg-soft hover:text-foreground"
          >
            <Settings2 className="h-4 w-4" />
            Account Settings
          </Link>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/10"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-border bg-surface px-4 py-3 md:hidden">
          <Link href="/dashboard" className="font-semibold text-primary">
            Nsplit
          </Link>
          <div className="flex items-center gap-2">
            <span className="max-w-[120px] truncate text-sm text-muted">
              {user?.name}
            </span>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="text-danger"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-8">{children}</main>

        <nav className="sticky bottom-0 z-30 flex border-t border-border bg-surface md:hidden">
          {primaryNav.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px]",
                  active ? "text-primary" : "text-muted"
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
