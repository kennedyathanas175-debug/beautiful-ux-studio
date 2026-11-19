import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Bookmark } from "lucide-react";
import { useBookmarks } from "@/lib/queries";
import { InnovationCard, OpportunityCard } from "@/components/site/cards";
import { OpportunityDialog } from "@/components/site/OpportunityDialog";
import { EmptyRow } from "@/components/dashboard/ui";
import { ErrorState, GridSkeleton } from "@/components/site/states";
import type { Opportunity } from "@/lib/api-types";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/saved")({
  component: SavedPage,
});

function SavedPage() {
  const query = useBookmarks();
  const [selected, setSelected] = useState<Opportunity | null>(null);

  if (query.isLoading) return <GridSkeleton count={3} />;
  if (query.isError || !query.data)
    return (
      <ErrorState title="Saved items could not be loaded" onRetry={() => void query.refetch()} />
    );

  const { innovations, opportunities } = query.data;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Saved</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Everything you bookmarked is stored in your TIE account.
        </p>
      </div>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">Innovations</h2>
          <span className="text-sm text-muted-foreground">{innovations.length}</span>
        </div>
        {innovations.length === 0 ? (
          <EmptyRow>
            No saved innovations yet. Use the bookmark button on any innovation card.
          </EmptyRow>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {innovations.map((item) => (
              <InnovationCard key={item.slug} item={item} />
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-foreground">Opportunities</h2>
          <span className="text-sm text-muted-foreground">{opportunities.length}</span>
        </div>
        {opportunities.length === 0 ? (
          <EmptyRow>
            No saved opportunities. Save challenges and grants to revisit them before the deadline.
          </EmptyRow>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2">
            {opportunities.map((item) => (
              <OpportunityCard key={item.id} opp={item} onOpen={setSelected} />
            ))}
          </div>
        )}
      </section>

      {innovations.length + opportunities.length === 0 && (
        <Button asChild variant="outline">
          <Link to="/explore">
            <Bookmark /> Explore innovations
          </Link>
        </Button>
      )}

      <OpportunityDialog opp={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
