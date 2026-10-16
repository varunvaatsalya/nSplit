"use client";

import { useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { FaGooglePlay } from "react-icons/fa";
import release from "@/config/app-release.json";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

function formatSize(bytes) {
  if (!bytes) return null;
  const mb = bytes / (1024 * 1024);
  return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return null;
  const date = new Date(`${iso}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? null
    : date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "Download app" trigger + dialog: Google Play (coming soon) and the direct APK
 * with its version, date and size from config/app-release.json.
 * `children` is the trigger's content; `className` styles the trigger button.
 */
export default function DownloadDialog({ className, children }) {
  const [open, setOpen] = useState(false);
  const available = Boolean(release.downloadUrl);
  const meta = [`Version ${release.version}`, formatDate(release.updatedAt), formatSize(release.sizeBytes)].filter(Boolean);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md gap-5 p-6">
          <div>
            <DialogTitle className="text-xl font-bold">Get nSplit for Android</DialogTitle>
            <DialogDescription className="mt-1 text-sm text-muted">
              Your groups sync with the web, so you can switch anytime.
            </DialogDescription>
          </div>

          {/* Direct download */}
          <div className="rounded-2xl border border-border bg-soft/60 p-4">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary dark:text-indigo-300">
                <Smartphone className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">Android app (APK)</div>
                <div className="mt-0.5 text-xs text-muted">{meta.join(" · ")}</div>
              </div>
            </div>
            {available ? (
              <>
                <a
                  href="/download"
                  className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition-opacity hover:opacity-90"
                >
                  <Download className="h-4 w-4" />
                  Download APK
                </a>
                <p className="mt-2.5 text-[11px] leading-4 text-muted">
                  Your phone may ask you to allow installs from your browser. That&apos;s expected for apps outside the
                  Play Store.
                </p>
              </>
            ) : (
              <div className="mt-4 flex h-11 w-full items-center justify-center rounded-xl border border-dashed border-border text-sm font-semibold text-muted">
                Coming soon
              </div>
            )}
          </div>

          {/* Play Store */}
          <div className="flex items-center gap-3 rounded-2xl border border-border p-4 opacity-80">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-soft">
              <FaGooglePlay className="h-5 w-5 text-muted" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">Google Play</div>
              <div className="mt-0.5 text-xs text-muted">We&apos;re getting the store listing ready.</div>
            </div>
            <span className="shrink-0 rounded-full bg-soft px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-muted">
              Coming soon
            </span>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
