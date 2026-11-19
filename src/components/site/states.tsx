import { AlertCircle, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="sr-only">{label}</span>
    </span>
  );
}

export function PageLoader({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="container-tie flex min-h-[40vh] flex-col items-center justify-center gap-3 py-20 text-center">
      <Loader2 className="size-7 animate-spin text-azure" aria-hidden />
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
    </div>
  );
}

export function ErrorState({
  title = "We couldn't load this page",
  message,
  onRetry,
}: {
  title?: string | undefined;
  message?: string | undefined;
  onRetry?: (() => void) | undefined;
}) {
  return (
    <div className="container-tie py-16">
      <div className="mx-auto max-w-lg rounded-2xl border border-dashed bg-card p-8 text-center">
        <span className="mx-auto grid size-12 place-items-center rounded-xl bg-warning-soft text-warning">
          <AlertCircle className="size-6" />
        </span>
        <h2 className="mt-4 text-lg font-semibold text-foreground">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {message ?? "The platform API did not respond. Check your connection and try again."}
        </p>
        {onRetry && (
          <Button variant="outline" className="mt-5" onClick={onRetry}>
            <RefreshCw /> Try again
          </Button>
        )}
      </div>
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="aspect-[16/10] bg-muted" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-24 rounded bg-muted" />
        <div className="h-5 w-3/4 rounded bg-muted" />
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-2/3 rounded bg-muted" />
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, index) => (
        <CardSkeleton key={index} />
      ))}
    </div>
  );
}

export function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="rounded-lg border-l-4 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"
    >
      {message}
    </p>
  );
}
