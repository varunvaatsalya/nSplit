"use client";

import { Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { CATEGORIES } from "@/shared/categories/index.js";
import { cn } from "@/lib/utils";

/** Category grid (same as the app's category sheet). */
export function CategoryPicker({ open, onOpenChange, value, suggestedKey, onSelect }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,600px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>Category</DialogTitle>
          <DialogDescription>Picked from the title. Change it any time.</DialogDescription>
        </DialogHeader>
        <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          <div className="grid grid-cols-3 gap-2.5">
            {CATEGORIES.map((category) => {
              const selected = category.key === value;
              const suggested = category.key === suggestedKey && category.key !== "other";
              return (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => {
                    onSelect?.(category);
                    onOpenChange?.(false);
                  }}
                  className={cn(
                    "relative flex cursor-pointer flex-col items-center rounded-2xl border px-1.5 py-3 text-center transition-colors hover:bg-soft",
                    selected ? "border-primary bg-soft" : "border-border bg-background",
                  )}
                >
                  {selected ? (
                    <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-primary-foreground">
                      <Check className="h-2.5 w-2.5" strokeWidth={3} />
                    </span>
                  ) : null}
                  <span className="mb-1.5 flex h-11 w-11 items-center justify-center rounded-full bg-soft text-[22px]">
                    {category.emoji}
                  </span>
                  <span className={cn("text-xs leading-tight", selected ? "font-bold" : "font-semibold")}>
                    {category.label}
                  </span>
                  {suggested ? (
                    <span className="mt-0.5 text-[10px] font-bold text-primary">Suggested</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
