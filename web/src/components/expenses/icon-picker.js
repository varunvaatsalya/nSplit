"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ICON_SECTIONS } from "@/lib/expense-icons";
import { cn } from "@/lib/utils";

/**
 * Emoji picker grouped by theme (same as the app). With `categoryIcon`, a top row
 * lets the user go back to the category's own icon.
 */
export function IconPicker({ open, onOpenChange, value, onSelect, categoryIcon, onUseCategoryIcon }) {
  const followsCategory = Boolean(categoryIcon && value === categoryIcon.emoji);

  function close() {
    onOpenChange?.(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,600px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>Choose icon</DialogTitle>
          <DialogDescription className="sr-only">Pick an emoji for this record.</DialogDescription>
        </DialogHeader>
        <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain p-4">
          {categoryIcon && onUseCategoryIcon ? (
            <button
              type="button"
              onClick={() => {
                onUseCategoryIcon();
                close();
              }}
              className={cn(
                "mb-5 flex w-full cursor-pointer items-center gap-3 rounded-2xl border p-3 text-left transition-colors hover:bg-soft",
                followsCategory ? "border-primary bg-soft" : "border-border bg-background",
              )}
            >
              <span className="text-2xl">{categoryIcon.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="block font-bold">Use category icon</span>
                <span className="block text-xs text-muted">Follows {categoryIcon.label}</span>
              </span>
              {followsCategory ? <span className="text-xs font-bold text-primary">Selected</span> : null}
            </button>
          ) : null}

          {ICON_SECTIONS.map((section) => (
            <div key={section.label} className="mb-5 last:mb-0">
              <div className="mb-2 text-[11px] font-bold tracking-[0.06em] text-muted">
                {section.label.toUpperCase()}
              </div>
              <div className="grid grid-cols-7 gap-2 sm:grid-cols-8">
                {section.emojis.map((emoji) => {
                  const selected = value === emoji && !followsCategory;
                  return (
                    <button
                      key={`${section.label}-${emoji}`}
                      type="button"
                      onClick={() => {
                        onSelect?.({ emoji });
                        close();
                      }}
                      className={cn(
                        "flex aspect-square w-full cursor-pointer items-center justify-center rounded-xl border-[1.5px] text-2xl transition-colors hover:bg-soft",
                        selected ? "border-primary bg-soft" : "border-transparent bg-background",
                      )}
                    >
                      {emoji}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
