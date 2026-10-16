"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/** Small "Log out" button; asks before logging out. */
export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function logout() {
    setBusy(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-danger/35 px-4 py-2 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
      <ConfirmDialog
        open={open}
        onOpenChange={(next) => !busy && setOpen(next)}
        title="Log out?"
        description="You can log in again anytime."
        confirmLabel="Log out"
        cancelLabel="Cancel"
        tone="danger"
        loading={busy}
        onConfirm={logout}
      />
    </>
  );
}
