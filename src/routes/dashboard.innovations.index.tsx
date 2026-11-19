import { createFileRoute, Link } from "@tanstack/react-router";
import { Eye, Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { CategoryIcon } from "@/components/site/bits";
import { ErrorState, GridSkeleton } from "@/components/site/states";
import { EmptyRow, StatusBadge } from "@/components/dashboard/ui";
import { api, errorMessage } from "@/lib/api";
import { useInnovationsList } from "@/lib/queries";

export const Route = createFileRoute("/dashboard/innovations/")({
  component: MyInnovationsPage,
});

function MyInnovationsPage() {
  const queryClient = useQueryClient();
  const query = useInnovationsList({ mine: true, page_size: 50 });
  const items = query.data?.results ?? [];

  const remove = async (slug: string, title: string) => {
    if (!window.confirm(`Archive “${title}”? It will disappear from public view.`)) return;
    try {
      await api.delete(`/innovations/${slug}/`);
      toast.success("Innovation archived");
      await queryClient.invalidateQueries({ queryKey: ["innovations"] });
      await queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      await queryClient.invalidateQueries({ queryKey: ["home"] });
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My innovations</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Drafts are private; published work appears across the platform.
          </p>
        </div>
        <Button asChild>
          <Link to="/dashboard/innovations/new">
            <Plus /> New innovation
          </Link>
        </Button>
      </div>

      {query.isError ? (
        <ErrorState
          message="Your innovations could not be loaded."
          onRetry={() => void query.refetch()}
        />
      ) : query.isLoading ? (
        <GridSkeleton count={3} />
      ) : items.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <EmptyRow>You have not created any innovations yet.</EmptyRow>
          <Button asChild className="mt-4">
            <Link to="/dashboard/innovations/new">
              <Plus /> Create your first innovation
            </Link>
          </Button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
          <ul className="divide-y">
            {items.map((item) => (
              <li key={item.slug} className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center">
                {item.image ? (
                  <img
                    src={item.image}
                    alt=""
                    className="aspect-[16/10] w-full rounded-lg object-cover sm:h-20 sm:w-32"
                  />
                ) : (
                  <span className="grid aspect-[16/10] w-full place-items-center rounded-lg bg-navy-gradient sm:h-20 sm:w-32">
                    <CategoryIcon id={item.category} className="size-6 text-gold/70" />
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      to="/innovations/$slug"
                      params={{ slug: item.slug }}
                      className="truncate font-semibold text-foreground hover:text-azure"
                    >
                      {item.title}
                    </Link>
                    <StatusBadge status={item.status} />
                  </div>
                  <p className="mt-1 line-clamp-1 text-sm text-muted-foreground">{item.tagline}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.likes} likes · {item.comments} comments · {item.views} views ·{" "}
                    {item.region}
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button asChild variant="ghost" size="sm">
                    <Link to="/innovations/$slug" params={{ slug: item.slug }}>
                      <Eye /> View
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/dashboard/innovations/$slug/edit" params={{ slug: item.slug }}>
                      <Pencil /> Edit
                    </Link>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => void remove(item.slug, item.title)}
                    aria-label={`Archive ${item.title}`}
                  >
                    <Trash2 />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {query.isFetching && (
        <p className="text-center text-xs text-muted-foreground">
          <Loader2 className="mr-1 inline size-3 animate-spin" /> Syncing…
        </p>
      )}
    </div>
  );
}
