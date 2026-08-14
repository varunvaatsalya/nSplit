"use client";

import { useEffect, useState } from "react";
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

const ADD_HOTKEY = "n";

function isTypingTarget(target) {
  if (!target || typeof target !== "object") return false;
  const tag = target.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    target.isContentEditable
  );
}

export function AddRecordModal({
  group,
  onCreated,
  editExpense = null,
  onEditClose,
}) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("expense");
  const isEdit = Boolean(editExpense?._id);

  function openCreate() {
    setTab("expense");
    setOpen(true);
  }

  useEffect(() => {
    if (!editExpense?._id) return;
    setTab("expense");
    setOpen(true);
  }, [editExpense?._id]);

  useEffect(() => {
    function onKeyDown(e) {
      if (open || isEdit) return;
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key.toLowerCase() !== ADD_HOTKEY) return;
      if (isTypingTarget(e.target)) return;
      e.preventDefault();
      openCreate();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, isEdit]);

  function handleOpenChange(next) {
    setOpen(next);
    if (!next) onEditClose?.();
  }

  function handleSaved() {
    setOpen(false);
    onEditClose?.();
    onCreated?.();
  }

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-40">
        <div className="mx-auto flex max-w-3xl justify-end px-4 sm:px-6">
          <div className="group/fab pointer-events-auto relative">
            <div
              className={cn(
                "pointer-events-none absolute bottom-[calc(100%+0.75rem)] right-0 z-10",
                "translate-y-1 scale-95 opacity-0 transition-all duration-200 ease-out",
                "group-hover/fab:translate-y-0 group-hover/fab:scale-100 group-hover/fab:opacity-100",
                "group-focus-within/fab:translate-y-0 group-focus-within/fab:scale-100 group-focus-within/fab:opacity-100",
              )}
            >
              <div className="flex items-center gap-2 rounded-full border border-border bg-surface/95 px-3 py-1.5 text-xs text-foreground shadow-lg backdrop-blur-sm">
                <span className="font-medium text-nowrap">Add expense</span>
                <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-border bg-soft px-1.5 font-mono text-[10px] font-semibold uppercase text-muted">
                  {ADD_HOTKEY}
                </kbd>
              </div>
            </div>

            <button
              type="button"
              onClick={openCreate}
              className={cn(
                "relative flex h-14 w-14 items-center justify-center rounded-full cursor-pointer",
                "bg-primary text-primary-foreground shadow-lg shadow-primary/25",
                "transition-all duration-200 ease-out",
                "hover:scale-105 hover:shadow-xl hover:shadow-primary/30",
                "active:scale-95",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              )}
              aria-label="Add record (press N)"
              title="Add record · Press N"
            >
              <Plus className="relative h-6 w-6 transition-transform duration-200 group-hover/fab:rotate-90" />
            </button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="flex max-h-[min(90vh,720px)] max-w-lg flex-col gap-0 overflow-hidden p-0">
          <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
            <DialogTitle className="sr-only">
              {isEdit ? "Edit expense" : "Add record"}
            </DialogTitle>
            <DialogDescription className="sr-only">
              {isEdit
                ? "Update expense details."
                : "Create an expense or transfer."}
            </DialogDescription>
            {isEdit ? (
              <div className="text-sm font-semibold tracking-tight">
                Edit expense
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="inline-flex rounded-full bg-muted-foreground/10 p-1">
                  <button
                    type="button"
                    onClick={() => setTab("expense")}
                    className={cn(
                      "rounded-full px-4 py-1 text-xs font-medium cursor-pointer transition-colors",
                      tab === "expense"
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    Expense
                  </button>
                  <button
                    type="button"
                    onClick={() => setTab("transfer")}
                    className={cn(
                      "rounded-full px-4 py-1.5 text-xs font-medium cursor-pointer transition-colors",
                      tab === "transfer"
                        ? "bg-surface text-foreground shadow-sm"
                        : "text-muted hover:text-foreground",
                    )}
                  >
                    Transfer
                  </button>
                </div>
              </div>
            )}
          </DialogHeader>

          {tab === "expense" || isEdit ? (
            <ExpenseForm
              key={
                isEdit
                  ? `edit-${editExpense._id}`
                  : open
                    ? `create-${group?._id}-${group?.settings?.defaultSplitMethod || "EQUAL"}`
                    : "create-idle"
              }
              group={group}
              expense={editExpense}
              embedded
              active={open && (tab === "expense" || isEdit)}
              onClose={() => handleOpenChange(false)}
              onCreated={handleSaved}
              onUpdated={handleSaved}
            />
          ) : (
            <TransferForm
              group={group}
              embedded
              active={open && tab === "transfer"}
              onClose={() => handleOpenChange(false)}
              onCreated={handleSaved}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
