"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { resolveAvatarStyle } from "@/lib/avatar";
import { cn } from "@/lib/utils";

/**
 * Renders avatar.url when set; otherwise avatar.letters on avatar.bg.
 */
export function UserAvatar({
  name,
  avatar,
  className,
  fallbackClassName,
  seed,
  title,
}) {
  const letters = (avatar?.letters || "?").toUpperCase();
  const style = resolveAvatarStyle(avatar, seed || name || letters);

  return (
    <Avatar className={className} title={title || name}>
      {avatar?.url ? (
        <AvatarImage src={avatar.url} alt={name || "User"} />
      ) : null}
      <AvatarFallback
        className={cn("bg-transparent text-xs font-semibold select-none", fallbackClassName)}
        style={{ backgroundColor: style.bg, color: style.fg }}
      >
        {letters}
      </AvatarFallback>
    </Avatar>
  );
}
