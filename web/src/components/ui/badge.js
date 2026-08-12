import { cn } from "@/lib/utils";

export function Badge({ className, variant = "default", ...props }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        variant === "default" && "bg-primary text-primary-foreground",
        variant === "secondary" && "bg-soft text-muted",
        variant === "outline" && "border border-border text-muted",
        className
      )}
      {...props}
    />
  );
}
