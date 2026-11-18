import { createFileRoute, Link } from "@tanstack/react-router";
import { Bookmark, Handshake, Heart, Lightbulb, Send, Users } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useDashboard } from "@/lib/queries";
import { ErrorState, PageLoader } from "@/components/site/states";
import { EmptyRow, SectionCard, StatCard, StatusBadge } from "@/components/dashboard/ui";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/")({
  component: DashboardOverview,
});

function DashboardOverview() {
  const { user } = useAuth();
  const query = useDashboard();

  if (query.isLoading) return <PageLoader label="Loading your dashboard…" />;
  if (query.isError || !query.data) {
    return (
      <ErrorState title="Your dashboard could not be loaded" onRetry={() => void query.refetch()} />
    );
  }
  const data = query.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A snapshot of your work and community activity.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/dashboard/innovations/new">Publish an innovation</Link>
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Innovations"
          value={data.stats.innovations}
          icon={Lightbulb}
          hint={`${data.stats.publishedInnovations} published`}
        />
        <StatCard
          label="Followers"
          value={data.stats.followers}
          icon={Users}
          hint={`Following ${data.stats.following}`}
        />
        <StatCard
          label="Likes received"
          value={data.stats.totalLikes}
          icon={Heart}
          hint="Across your innovations"
        />
        <StatCard
          label="Pending requests"
          value={data.stats.pendingRequests}
          icon={Handshake}
          hint="Awaiting your response"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SectionCard
          title="Recent innovations"
          action={
            <Link
              to="/dashboard/innovations"
              className="text-xs font-semibold text-azure hover:underline"
            >
              Manage all
            </Link>
          }
        >
          {data.innovations.length === 0 ? (
            <EmptyRow>You have not created an innovation yet.</EmptyRow>
          ) : (
            <ul className="divide-y">
              {data.innovations.map((item) => (
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
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {item.likes} likes · {item.comments} comments · {item.views} views
                    </p>
                  </div>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Collaboration requests"
          action={
            <Link
              to="/dashboard/requests"
              className="text-xs font-semibold text-azure hover:underline"
            >
              Open inbox
            </Link>
          }
        >
          {data.requests.length === 0 ? (
            <EmptyRow>
              No pending requests. Your public profile makes it easy for people to reach you.
            </EmptyRow>
          ) : (
            <ul className="divide-y">
              {data.requests.map((request) => (
                <li key={request.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <Link
                      to="/innovators/$slug"
                      params={{ slug: request.sender.slug }}
                      className="truncate text-sm font-semibold text-foreground hover:text-azure"
                    >
                      {request.sender.name}
                    </Link>
                    <StatusBadge status={request.status} />
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                    {request.message}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Notifications"
          action={
            <Link
              to="/dashboard/notifications"
              className="text-xs font-semibold text-azure hover:underline"
            >
              View all
            </Link>
          }
        >
          {data.notifications.length === 0 ? (
            <EmptyRow>No notifications yet.</EmptyRow>
          ) : (
            <ul className="divide-y">
              {data.notifications.map((notification) => (
                <li key={notification.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">
                        {notification.title}
                      </p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <span
                        className="mt-1 size-2 shrink-0 rounded-full bg-azure"
                        aria-label="Unread"
                      />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Opportunity applications"
          action={
            <Link
              to="/dashboard/applications"
              className="text-xs font-semibold text-azure hover:underline"
            >
              View all
            </Link>
          }
        >
          {data.applications.length === 0 ? (
            <EmptyRow>You have not applied to an opportunity yet.</EmptyRow>
          ) : (
            <ul className="divide-y">
              {data.applications.map((application) => (
                <li
                  key={application.id}
                  className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {application.opportunity.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Submitted {new Date(application.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <StatusBadge status={application.status} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          {
            to: "/dashboard/saved",
            label: "Saved items",
            icon: Bookmark,
            hint: `${data.stats.savedInnovations} innovations · ${data.stats.savedOpportunities} opportunities`,
          },
          {
            to: "/dashboard/requests",
            label: "Respond to requests",
            icon: Handshake,
            hint: `${data.stats.pendingRequests} pending`,
          },
          {
            to: "/dashboard/applications",
            label: "My applications",
            icon: Send,
            hint: "Track opportunity progress",
          },
          {
            to: "/dashboard/notifications",
            label: "Notifications",
            icon: Users,
            hint: `${data.stats.unreadNotifications} unread`,
          },
        ].map((item) => (
          <Link
            key={item.to}
            to={item.to as never}
            className="group rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-gold"
          >
            <item.icon className="size-5 text-azure" />
            <p className="mt-3 text-sm font-semibold text-foreground group-hover:text-azure">
              {item.label}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{item.hint}</p>
          </Link>
        ))}
      </div>

      {user?.isStaff && (
        <div className="rounded-xl border border-azure/30 bg-info-soft p-4 text-sm text-foreground">
          You have staff access. Visit the{" "}
          <Link to="/moderation" className="font-semibold underline">
            moderation workspace
          </Link>{" "}
          to review reports, content and opportunities.
        </div>
      )}
    </div>
  );
}
