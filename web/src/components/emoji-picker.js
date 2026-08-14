"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EMOJI_ICONS } from "@/lib/emoji-icons";
import { cn } from "@/lib/utils";

export function EmojiPicker({
  open,
  onOpenChange,
  value,
  onSelect,
  title = "Choose icon",
  description = "Tap an emoji.",
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(85vh,560px)] max-w-md flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-10">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="nsplit-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-3">
          <div className="grid grid-cols-6 gap-2 sm:grid-cols-8">
            {EMOJI_ICONS.map((item) => {
              const selected = value === item.emoji;
              return (
                <button
                  key={item.emoji}
                  type="button"
                  title={item.label}
                  onClick={() => {
                    onSelect?.(item);
                    onOpenChange?.(false);
                  }}
                  className={cn(
                    "flex h-10 w-full items-center justify-center rounded-lg border text-xl transition-colors hover:bg-soft",
                    selected
                      ? "border-primary bg-soft"
                      : "border-border bg-background"
                  )}
                >
                  {item.emoji}
                </button>
              );
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
