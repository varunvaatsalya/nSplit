"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

/** Labeled input with a leading icon, inline error/hint and an optional password toggle. */
export function AuthField({ label, icon: Icon, error, hint, password = false, className, ...props }) {
  const id = useId();
  const [visible, setVisible] = useState(false);
  const noteId = `${id}-note`;

  return (
    <div className={className}>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold">
        {label}
      </label>
      <div
        className={cn(
          "flex h-12 items-center gap-2.5 rounded-xl border-[1.5px] bg-surface px-3.5 transition-colors focus-within:border-primary",
          error ? "border-danger focus-within:border-danger" : "border-border",
        )}
      >
        {Icon ? <Icon className="h-4.5 w-4.5 shrink-0 text-muted" aria-hidden /> : null}
        <input
          id={id}
          type={password && !visible ? "password" : props.type || "text"}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? noteId : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted"
          {...props}
        />
        {password ? (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="cursor-pointer rounded-md p-1 text-muted hover:text-foreground"
            aria-label={visible ? "Hide password" : "Show password"}
          >
            {visible ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={noteId} className="mt-1.5 text-xs text-danger">
          {error}
        </p>
      ) : hint ? (
        <div id={noteId} className="mt-1.5 text-xs text-muted">
          {hint}
        </div>
      ) : null}
    </div>
  );
}
