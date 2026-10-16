"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";

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

/**
 * Google's own "Continue with Google" button. It hands us an ID token, which
 * the server verifies and turns into a normal nSplit session.
 * Renders nothing until NEXT_PUBLIC_GOOGLE_CLIENT_ID is set.
 */
export function GoogleButton({ next = "/groups", text = "continue_with", onError }) {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const holder = useRef(null);
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
          return;
        }
        router.push(latest.current.next);
        router.refresh();
      } catch {
        setError("Could not reach nSplit. Check your connection and try again.");
      } finally {
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
          theme: resolvedTheme === "dark" ? "filled_black" : "outline",
          size: "large",
          shape: "pill",
          text,
          logo_alignment: "center",
          width: Math.min(400, Math.max(200, Math.round(holder.current.offsetWidth || 320))),
        });
      })
      .catch(() => !cancelled && setError("Could not load Google sign-in. Check your connection."));

    return () => {
      cancelled = true;
    };
  }, [resolvedTheme, text, router]);

  if (!CLIENT_ID) return null;

  return (
    <div className="space-y-2">
      <div className={busy ? "pointer-events-none opacity-60" : undefined}>
        <div ref={holder} className="flex min-h-11 w-full justify-center" />
      </div>
      {busy ? <p className="text-center text-sm text-muted">Signing you in…</p> : null}
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
