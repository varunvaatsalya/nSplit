"use client";

import * as AvatarPrimitive from "@radix-ui/react-avatar";
import { cn } from "@/lib/utils";

export function Avatar({ className, ...props }) {
  return (
    <AvatarPrimitive.Root
      data-slot="avatar"
      className={cn(
        "relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full",
        className
      )}
      {...props}
    />
  );
}

export function AvatarImage({ className, ...props }) {
  return (
    <AvatarPrimitive.Image
      data-slot="avatar-image"
      className={cn("aspect-square h-full w-full", className)}
      {...props}
    />
  );
}

export function AvatarFallback({ className, ...props }) {
  return (
    <AvatarPrimitive.Fallback
      data-slot="avatar-fallback"
      className={cn(
        "flex h-full w-full items-center justify-center rounded-full bg-soft text-xs font-semibold text-muted",
        className
      )}
      {...props}
    />
  );
}

export function AvatarGroup({ className, ...props }) {
  return (
    <div
      data-slot="avatar-group"
      className={cn(
        "group/avatar-group flex -space-x-1 *:data-[slot=avatar]:ring-2 *:data-[slot=avatar]:ring-surface",
        className
      )}
      {...props}
    />
  );
}

export function AvatarGroupCount({ className, ...props }) {
  return (
    <div
      data-slot="avatar-group-count"
      className={cn(
        "relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-soft text-[10px] font-semibold text-muted ring-2 ring-surface",
        className
      )}
      {...props}
    />
  );
}
