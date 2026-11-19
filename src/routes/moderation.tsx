import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  EyeOff,
  FileWarning,
  Loader2,
  Pencil,
  Plus,
  Rocket,
  ShieldCheck,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { api, errorMessage } from "@/lib/api";
import { useModeration, useStaffInstitutions, useStaffOpportunities } from "@/lib/queries";
import { ErrorState, PageLoader } from "@/components/site/states";
import { EmptyRow, SectionCard, StatCard, StatusBadge } from "@/components/dashboard/ui";
import {
  OpportunityAdminDialog,
  InstitutionAdminDialog,
} from "@/components/dashboard/AdminDialogs";
import type { Institution, Opportunity } from "@/lib/api-types";

export const Route = createFileRoute("/moderation")({
  head: () => ({ meta: [{ title: "Moderation – TIE" }, { name: "robots", content: "noindex" }] }),
  component: ModerationPage,
});

type Tab = "reports" | "content" | "applications" | "opportunities" | "institutions";

const tabs: { id: Tab; label: string }[] = [
  { id: "reports", label: "Reports" },
  { id: "content", label: "Content" },
  { id: "applications", label: "Applications" },
  { id: "opportunities", label: "Opportunities" },
  { id: "institutions", label: "Institutions" },
];

function ModerationPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("reports");
  const [opportunityDialog, setOpportunityDialog] = useState<{
    open: boolean;
    item: Opportunity | null;
  }>({ open: false, item: null });
  const [institutionDialog, setInstitutionDialog] = useState<{
    open: boolean;
    item: Institution | null;
  }>({ open: false, item: null });
  const overview = useModeration();
  const opportunities = useStaffOpportunities();
  const institutions = useStaffInstitutions();

  useEffect(() => {
    if (!loading && user && !user.isStaff) void navigate({ to: "/dashboard" });
  }, [loading, user, navigate]);

  if (loading) return <PageLoader label="Checking staff access…" />;
  if (!user?.isStaff) {
    return (
      <ErrorState
        title="Staff access required"
        message="This workspace is only available to TIE moderators."
      />
    );
  }
  if (overview.isLoading) return <PageLoader label="Loading moderation workspace…" />;
  if (overview.isError || !overview.data)
    return (
      <ErrorState
        title="Moderation data could not be loaded"
        onRetry={() => void overview.refetch()}
      />
    );

  const data = overview.data;

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["moderation"] });
    await queryClient.invalidateQueries({ queryKey: ["innovations"] });
    await queryClient.invalidateQueries({ queryKey: ["opportunities"] });
    await queryClient.invalidateQueries({ queryKey: ["institutions"] });
    await queryClient.invalidateQueries({ queryKey: ["home"] });
    await queryClient.invalidateQueries({ queryKey: ["applications"] });
  };

  const resolveReport = async (id: number, status: "resolved" | "dismissed") => {
    const note =
      window.prompt(
        status === "resolved"
          ? "Resolution note (the reported content will be hidden):"
          : "Reason for dismissing (optional):",
        "",
      ) ?? "";
    try {
      await api.patch(`/reports/${id}/`, { status, resolutionNote: note });
      toast.success(
        status === "resolved" ? "Report resolved and content hidden" : "Report dismissed",
      );
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const restoreContent = async (slug: string, status: "published" | "hidden") => {
    try {
      await api.post(`/innovations/${slug}/moderate/`, { status });
      toast.success(status === "published" ? "Content published" : "Content hidden");
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const reviewApplication = async (id: number, status: "accepted" | "rejected") => {
    const note =
      window.prompt(
        `${status === "accepted" ? "Accept" : "Reject"} application — add a note for the applicant (optional):`,
        "",
      ) ?? "";
    try {
      await api.patch(`/applications/${id}/`, { status, reviewNote: note });
      toast.success(`Application ${status}`);
      await refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="container-tie py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <ShieldCheck className="size-4" /> Staff workspace
          </p>
          <h1 className="mt-1 text-3xl font-bold text-foreground">Moderation</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review reports, manage content and keep the ecosystem healthy.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>

      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Open reports"
          value={data.stats.reportsOpen}
          icon={FileWarning}
          hint="Needs review"
        />
        <StatCard
          label="Published innovations"
          value={data.stats.innovationsPublished}
          icon={Rocket}
          hint={`${data.stats.innovationsDraft} drafts · ${data.stats.innovationsHidden} hidden`}
        />
        <StatCard
          label="Community members"
          value={data.stats.users}
          icon={Users}
          hint={`${data.stats.pendingCollaborationRequests} pending requests`}
        />
        <StatCard
          label="Applications"
          value={data.stats.applications}
          icon={CheckCircle2}
          hint={`${data.stats.opportunities} opportunities`}
        />
      </div>

      <div className="mt-6 flex gap-1 overflow-x-auto rounded-lg border bg-secondary p-1 scrollbar-none">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            aria-pressed={tab === item.id}
            className={`shrink-0 rounded-md px-4 py-2 text-sm font-semibold transition-colors ${tab === item.id ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
          >
            {item.label}
            {item.id === "reports" && data.stats.reportsOpen > 0 && (
              <span className="ml-1.5 rounded-full bg-destructive px-1.5 text-[0.65rem] text-destructive-foreground">
                {data.stats.reportsOpen}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "reports" && (
          <SectionCard title="Open reports">
            {data.reports.length === 0 ? (
              <EmptyRow>No open reports. The community is in good shape.</EmptyRow>
            ) : (
              <ul className="divide-y">
                {data.reports.map((report) => (
                  <li key={report.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {report.innovation ? (
                            <Link
                              to="/innovations/$slug"
                              params={{ slug: report.innovation.slug }}
                              className="hover:text-azure"
                            >
                              {report.innovation.title}
                            </Link>
                          ) : report.comment ? (
                            <span>
                              Comment by {report.comment.author} on {report.comment.innovationSlug}
                            </span>
                          ) : (
                            "Reported content"
                          )}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          Reported by {report.reporter.name} · {report.reason} ·{" "}
                          {new Date(report.createdAt).toLocaleDateString()}
                        </p>
                        {report.details && (
                          <p className="mt-2 text-sm text-muted-foreground">“{report.details}”</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => void resolveReport(report.id, "resolved")}
                        >
                          <EyeOff /> Resolve & hide
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void resolveReport(report.id, "dismissed")}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {tab === "content" && (
          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard title={`Hidden content (${data.hiddenInnovations.length})`}>
              {data.hiddenInnovations.length === 0 ? (
                <EmptyRow>No hidden innovations.</EmptyRow>
              ) : (
                <ul className="divide-y">
                  {data.hiddenInnovations.map((item) => (
                    <li
                      key={item.slug}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <Link
                          to="/innovations/$slug"
                          params={{ slug: item.slug }}
                          className="block truncate text-sm font-semibold text-foreground hover:text-azure"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-muted-foreground">By {item.creator.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void restoreContent(item.slug, "published")}
                      >
                        Publish
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
            <SectionCard title={`Drafts (${data.draftInnovations.length})`}>
              {data.draftInnovations.length === 0 ? (
                <EmptyRow>No drafts awaiting anything.</EmptyRow>
              ) : (
                <ul className="divide-y">
                  {data.draftInnovations.map((item) => (
                    <li
                      key={item.slug}
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="block truncate text-sm font-semibold text-foreground">
                          {item.title}
                        </p>
                        <p className="text-xs text-muted-foreground">By {item.creator.name}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => void restoreContent(item.slug, "published")}
                      >
                        Publish
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          </div>
        )}

        {tab === "applications" && (
          <SectionCard title="Recent opportunity applications">
            {data.applications.length === 0 ? (
              <EmptyRow>No applications yet.</EmptyRow>
            ) : (
              <ul className="divide-y">
                {data.applications.map((application) => (
                  <li key={application.id} className="py-4 first:pt-0 last:pb-0">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {application.applicant.name} → {application.opportunity.title}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {application.applicantEmail} ·{" "}
                          {new Date(application.createdAt).toLocaleDateString()}
                        </p>
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {application.motivation}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={application.status} />
                        {["submitted", "under_review"].includes(application.status) && (
                          <>
                            <Button
                              size="sm"
                              onClick={() => void reviewApplication(application.id, "accepted")}
                            >
                              Accept
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => void reviewApplication(application.id, "rejected")}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {tab === "opportunities" && (
          <SectionCard
            title="Opportunities"
            action={
              <Button size="sm" onClick={() => setOpportunityDialog({ open: true, item: null })}>
                <Plus /> New opportunity
              </Button>
            }
          >
            {opportunities.isLoading ? (
              <p className="text-sm text-muted-foreground">
                <Loader2 className="inline size-4 animate-spin" /> Loading…
              </p>
            ) : opportunities.isError ? (
              <ErrorState
                message="Opportunities could not be loaded."
                onRetry={() => void opportunities.refetch()}
              />
            ) : (opportunities.data?.results.length ?? 0) === 0 ? (
              <EmptyRow>No opportunities.</EmptyRow>
            ) : (
              <ul className="divide-y">
                {opportunities.data?.results.map((opportunity) => (
                  <li
                    key={opportunity.slug}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {opportunity.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {opportunity.type} · deadline {opportunity.deadline} ·{" "}
                        {opportunity.applicationCount} applications
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={opportunity.status} />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setOpportunityDialog({ open: true, item: opportunity })}
                      >
                        <Pencil /> Edit
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}

        {tab === "institutions" && (
          <SectionCard
            title="Institutions"
            action={
              <Button size="sm" onClick={() => setInstitutionDialog({ open: true, item: null })}>
                <Plus /> New institution
              </Button>
            }
          >
            {institutions.isLoading ? (
              <p className="text-sm text-muted-foreground">
                <Loader2 className="inline size-4 animate-spin" /> Loading…
              </p>
            ) : institutions.isError ? (
              <ErrorState
                message="Institutions could not be loaded."
                onRetry={() => void institutions.refetch()}
              />
            ) : (institutions.data?.results.length ?? 0) === 0 ? (
              <EmptyRow>No institutions.</EmptyRow>
            ) : (
              <ul className="divide-y">
                {institutions.data?.results.map((institution) => (
                  <li
                    key={institution.slug}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {institution.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {institution.type} · {institution.location} ·{" "}
                        {institution.innovationCount ?? 0} innovations
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setInstitutionDialog({ open: true, item: institution })}
                    >
                      <Pencil /> Edit
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        )}
      </div>

      <div className="mt-6 rounded-xl border border-dashed p-4 text-xs text-muted-foreground">
        <AlertTriangle className="mr-1 inline size-4" /> Django's built-in admin is also available
        for full data operations at <code>/admin/</code>. All moderation actions here are
        permission-checked by the API.
      </div>

      <OpportunityAdminDialog
        open={opportunityDialog.open}
        opportunity={opportunityDialog.item}
        onClose={() => setOpportunityDialog({ open: false, item: null })}
      />
      <InstitutionAdminDialog
        open={institutionDialog.open}
        institution={institutionDialog.item}
        onClose={() => setInstitutionDialog({ open: false, item: null })}
      />
    </div>
  );
}
