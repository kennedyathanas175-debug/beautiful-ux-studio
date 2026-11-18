import { createFileRoute, Link } from "@tanstack/react-router";
import { useMyApplications } from "@/lib/queries";
import { EmptyRow, StatusBadge } from "@/components/dashboard/ui";
import { ErrorState, PageLoader } from "@/components/site/states";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/applications")({
  component: ApplicationsPage,
});

function ApplicationsPage() {
  const query = useMyApplications();
  if (query.isLoading) return <PageLoader label="Loading your applications…" />;
  if (query.isError || !query.data)
    return (
      <ErrorState title="Applications could not be loaded" onRetry={() => void query.refetch()} />
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My applications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track the opportunities you have applied to.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/opportunities">Browse opportunities</Link>
        </Button>
      </div>
      {query.data.results.length === 0 ? (
        <EmptyRow>You have not applied to any opportunity yet.</EmptyRow>
      ) : (
        <ul className="space-y-3">
          {query.data.results.map((application) => (
            <li key={application.id} className="rounded-2xl border bg-card p-5 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <h2 className="font-semibold text-foreground">{application.opportunity.title}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Deadline{" "}
                    {new Date(`${application.opportunity.deadline}T12:00:00`).toLocaleDateString()}{" "}
                    · Submitted {new Date(application.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <StatusBadge status={application.status} />
              </div>
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer font-medium text-muted-foreground hover:text-foreground">
                  View your motivation
                </summary>
                <p className="mt-2 whitespace-pre-wrap rounded-xl bg-surface p-3 leading-relaxed text-foreground">
                  {application.motivation}
                </p>
              </details>
              {application.reviewNote && (
                <p className="mt-3 rounded-xl border-l-4 border-gold bg-accent p-3 text-sm text-accent-foreground">
                  Reviewer note: {application.reviewNote}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
