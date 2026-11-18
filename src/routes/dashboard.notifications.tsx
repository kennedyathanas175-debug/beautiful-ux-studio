import { createFileRoute } from "@tanstack/react-router";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { EmptyRow } from "@/components/dashboard/ui";
import { ErrorState, PageLoader } from "@/components/site/states";
import { api, errorMessage } from "@/lib/api";
import { useNotifications } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/notifications")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const query = useNotifications();
  const queryClient = useQueryClient();

  const markAll = async () => {
    try {
      await api.post("/auth/notifications/read-all/");
      toast.success("All notifications marked as read");
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  const markOne = async (id: number) => {
    try {
      await api.post(`/auth/notifications/${id}/read/`);
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (query.isLoading) return <PageLoader label="Loading notifications…" />;
  if (query.isError || !query.data)
    return (
      <ErrorState title="Notifications could not be loaded" onRetry={() => void query.refetch()} />
    );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {query.data.unreadCount} unread · {query.data.count} total
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void markAll()}
          disabled={query.data.unreadCount === 0}
        >
          <CheckCheck /> Mark all as read
        </Button>
      </div>

      {query.data.results.length === 0 ? (
        <EmptyRow>No notifications yet.</EmptyRow>
      ) : (
        <ul className="divide-y overflow-hidden rounded-2xl border bg-card shadow-card">
          {query.data.results.map((notification) => (
            <li key={notification.id} className={notification.isRead ? "p-4" : "bg-accent/40 p-4"}>
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1 grid size-9 shrink-0 place-items-center rounded-lg ${notification.isRead ? "bg-secondary text-muted-foreground" : "bg-gold-soft text-accent-foreground"}`}
                >
                  <Bell className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{notification.title}</p>
                    {!notification.isRead && (
                      <span className="size-2 rounded-full bg-azure" aria-label="Unread" />
                    )}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{notification.message}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs">
                    <span className="text-muted-foreground">
                      {new Date(notification.createdAt).toLocaleString()}
                    </span>
                    {notification.url && (
                      <a
                        href={notification.url}
                        className="font-semibold text-azure hover:underline"
                      >
                        Open
                      </a>
                    )}
                    {!notification.isRead && (
                      <button
                        type="button"
                        onClick={() => void markOne(notification.id)}
                        className="inline-flex items-center gap-1 font-semibold text-muted-foreground hover:text-foreground"
                      >
                        <Loader2 className="hidden" /> Mark as read
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
