"use client";

import { useEffect, useState } from "react";
import { ChevronRight, SunMoon } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeSelect } from "@/components/theme-select";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

const LABEL = { light: "Light", dark: "Dark", system: "System" };

/** Profile row showing the current theme; opens the options in a dialog. */
export function AppearanceButton() {
  const { theme } = useTheme();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // next-themes only knows the theme in the browser.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full cursor-pointer items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 text-left transition-colors hover:bg-soft"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary dark:text-indigo-300">
          <SunMoon className="h-4.5 w-4.5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">Appearance</span>
          <span className="block text-xs text-muted">{mounted ? LABEL[theme] || "System" : " "}</span>
        </span>
        <ChevronRight className="h-4 w-4 text-muted" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogTitle className="text-lg font-bold">Appearance</DialogTitle>
          <DialogDescription className="-mt-1 text-sm text-muted">
            Choose how nSplit looks on this device. Defaults to your system theme.
          </DialogDescription>
          <ThemeSelect />
        </DialogContent>
      </Dialog>
    </>
  );
}
