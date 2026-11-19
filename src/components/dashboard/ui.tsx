import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const tones: Record<string, "success" | "warning" | "info" | "secondary" | "destructive" | "gold"> =
  {
    published: "success",
    accepted: "success",
    approved: "success",
    draft: "secondary",
    pending: "warning",
    under_review: "info",
    submitted: "info",
    hidden: "warning",
    rejected: "destructive",
    declined: "destructive",
    withdrawn: "secondary",
    archived: "secondary",
    open: "warning",
    resolved: "success",
    dismissed: "secondary",
    closed: "secondary",
  };

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.replaceAll("_", " ");
  return (
    <Badge variant={tones[status] ?? "secondary"} className={cn("capitalize", className)}>
      {label}
    </Badge>
  );
}

export function StatCard({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: number | string;
  icon: typeof ArrowRight;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4 shadow-card">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </p>
        <Icon className="size-4 text-azure" />
      </div>
      <p className="mt-2 font-display text-2xl font-bold text-foreground">
        {typeof value === "number" ? value.toLocaleString("en") : value}
      </p>
      {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border bg-card p-5 shadow-card", className)}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed p-5 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}
