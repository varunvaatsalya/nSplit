"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const SCRIPT_SRC = "https://accounts.google.com/gsi/client";

let scriptPromise = null;
function loadGoogleScript() {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.google?.accounts?.id) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error("Could not load Google sign-in"));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

export function GoogleLogo({ className }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/**
 * "Continue with Google" styled like the rest of the form (and the theme).
 * Google's own button sits invisibly on top so the click still opens Google's
 * account picker; we get an ID token back, which the server turns into a session.
 * Renders nothing until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
 */
export function GoogleButton({ next = "/groups", label = "Continue with Google", onError }) {
  const router = useRouter();
  const holder = useRef(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // The latest values for Google's callback, which is registered once.
  const latest = useRef({ next, onError });
  useEffect(() => {
    latest.current = { next, onError };
  });

  useEffect(() => {
    if (!CLIENT_ID) return;
    let cancelled = false;

    async function onCredential(response) {
      setBusy(true);
      setError("");
      try {
        const res = await fetch("/api/auth/google", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idToken: response.credential }),
        });
        const json = await res.json().catch(() => null);
        if (!res.ok) {
          const message = json?.error?.message || "Google sign-in failed. Please try again.";
          setError(message);
          latest.current.onError?.(message);
          setBusy(false);
          return;
        }
        // Stay in the loading state until the next page takes over.
        router.push(latest.current.next);
        router.refresh();
      } catch {
        setError("Could not reach nSplit. Check your connection and try again.");
        setBusy(false);
      }
    }

    loadGoogleScript()
      .then(() => {
        if (cancelled || !holder.current) return;
        window.google.accounts.id.initialize({ client_id: CLIENT_ID, callback: onCredential, ux_mode: "popup" });
        holder.current.innerHTML = "";
        window.google.accounts.id.renderButton(holder.current, {
          type: "standard",
          size: "large",
          text: "continue_with",
          width: Math.min(400, Math.max(200, Math.round(holder.current.parentElement?.offsetWidth || 320))),
        });
        setReady(true);
      })
      .catch(() => !cancelled && setError("Could not load Google sign-in. Check your connection."));

    return () => {
      cancelled = true;
    };
  }, [router]);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-2">
      <div className="group relative">
        {/* What people see. */}
        <div
          aria-hidden="true"
          className={[
            "flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border-[1.5px] border-border bg-surface text-[15px] font-semibold text-foreground transition-colors",
            busy ? "opacity-80" : "group-hover:bg-soft",
            ready || busy ? "" : "opacity-60",
          ].join(" ")}
        >
          {busy ? <Loader2 className="h-5 w-5 animate-spin text-muted" /> : <GoogleLogo className="h-5 w-5" />}
          {busy ? "Signing you in…" : label}
        </div>
        {/* Google's real button, stretched over ours and invisible. */}
        <div
          className={[
            "absolute inset-0 flex items-center justify-center overflow-hidden rounded-xl opacity-[0.01]",
            busy || !ready ? "pointer-events-none" : "",
          ].join(" ")}
        >
          <div ref={holder} className="origin-center scale-y-[1.25]" />
        </div>
      </div>
      {error ? (
        <p className="rounded-xl bg-danger/10 px-3 py-2.5 text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** "or" line between the Google button and the email form. */
export function AuthDivider() {
  if (!CLIENT_ID) return null;
  return (
    <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.08em] text-muted">
      <span className="h-px flex-1 bg-border" />
      or
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}
