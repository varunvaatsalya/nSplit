"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { ExpenseForm } from "@/components/expenses/expense-form";
import { TransferForm } from "@/components/transfers/transfer-form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function AddRecordModal({ group, onCreated }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("expense");

  function handleCreated() {
    setOpen(false);
    onCreated?.();
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setTab("expense");
          setOpen(true);
        }}
        className="fixed bottom-20 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md hover:opacity-95 md:bottom-6"
        aria-label="Add record"
      >
        <Plus className="h-6 w-6" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle className="sr-only">Add record</DialogTitle>
            <DialogDescription className="sr-only">
              Create an expense or transfer.
            </DialogDescription>
            <div className="flex rounded-lg bg-soft p-1">
              <button
                type="button"
                onClick={() => setTab("expense")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === "expense"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                Expense
              </button>
              <button
                type="button"
                onClick={() => setTab("transfer")}
                className={cn(
                  "flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  tab === "transfer"
                    ? "bg-surface text-foreground shadow-sm"
                    : "text-muted hover:text-foreground"
                )}
              >
                Transfer
              </button>
            </div>
          </DialogHeader>

          {tab === "expense" ? (
            <ExpenseForm
              group={group}
              embedded
              active={open && tab === "expense"}
              onClose={() => setOpen(false)}
              onCreated={handleCreated}
            />
          ) : (
            <TransferForm
              group={group}
              embedded
              active={open && tab === "transfer"}
              onClose={() => setOpen(false)}
              onCreated={handleCreated}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
