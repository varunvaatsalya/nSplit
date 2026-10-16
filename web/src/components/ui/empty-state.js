import { cn } from "@/lib/utils";

/** Illustration + title + text + actions, matching the app's empty screens. */
export function EmptyState({ illustration, title, children, actions, className }) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      {/* The artwork uses dark line work, so it sits on a light card in dark mode. */}
      <div className="w-60 sm:w-72 dark:rounded-3xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- static SVG, nothing to optimize */}
        <img src={illustration} alt="" width={288} height={288} className="h-auto w-full" />
      </div>
      <p className="mt-4 text-xl font-bold">{title}</p>
      {children ? <p className="mt-1.5 max-w-xs text-sm leading-5 text-muted">{children}</p> : null}
      {actions ? <div className="mt-5 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </div>
  );
}
