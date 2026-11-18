import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, CalendarX } from "lucide-react";
import { opportunityTypes, type Opportunity, type OppType } from "@/data/catalog";
import { photos } from "@/data/photos";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PageIntro } from "@/components/site/bits";
import { OpportunityCard } from "@/components/site/cards";
import { OpportunityDialog } from "@/components/site/OpportunityDialog";
import { ErrorState, GridSkeleton } from "@/components/site/states";
import { Button } from "@/components/ui/button";
import { useInfiniteOpportunities } from "@/lib/queries";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities & Challenges – TIE Tanzania Innovation Ecosystem" },
      {
        name: "description",
        content:
          "Innovation challenges, hackathons, grants, research calls, internships and programs for Tanzanian innovators.",
      },
      { property: "og:title", content: "Opportunities for Tanzanian Innovators – TIE" },
      {
        property: "og:description",
        content: "Challenges, grants and programs with deadlines and eligibility.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OpportunitiesPage,
});

const types: (OppType | "All")[] = ["All", ...opportunityTypes];

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function OpportunitiesPage() {
  const { t, lang } = usePrefs();
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("All");
  const [openOnly, setOpenOnly] = useState(true);
  const [selected, setSelected] = useState<Opportunity | null>(null);
  const debounced = useDebouncedValue(q.trim());

  const query = useInfiniteOpportunities({
    q: debounced || undefined,
    type: type === "All" ? undefined : type,
    open_only: openOnly,
  });
  const list = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;

  return (
    <>
      <PageIntro
        eyebrow={t("nav.opportunities")}
        title={t("sec.opps.title")}
        body={t("sec.opps.body")}
        photo={photos.stoneTown}
      />
      <section className="container-tie py-10">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 shadow-card focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="opp-q" className="sr-only">
            Search opportunities
          </label>
          <input
            id="opp-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={lang === "sw" ? "Tafuta fursa" : "Search opportunities"}
            className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {types.map((item) => (
              <button
                key={item}
                type="button"
                aria-pressed={type === item}
                onClick={() => setType(item)}
                className={cn(
                  "h-9 shrink-0 rounded-md border px-3 text-[0.8rem] font-semibold transition-colors",
                  type === item
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {item === "All" ? (lang === "sw" ? "Zote" : "All") : item}
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={openOnly}
              onChange={(e) => setOpenOnly(e.target.checked)}
              className="size-4 accent-primary"
            />
            {lang === "sw" ? "Zilizo wazi tu" : "Open only"}
          </label>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          <strong className="text-foreground">{total}</strong>{" "}
          {lang === "sw" ? "fursa" : "opportunities"}
        </p>

        {query.isError ? (
          <ErrorState
            message="Opportunities could not be loaded."
            onRetry={() => void query.refetch()}
          />
        ) : query.isLoading ? (
          <div className="mt-8">
            <GridSkeleton />
          </div>
        ) : list.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed bg-card p-12 text-center">
            <CalendarX className="size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">
              {lang === "sw" ? "Hakuna fursa zinazolingana" : "No matching opportunities"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("explore.empty.body")}</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((o) => (
                <OpportunityCard key={o.id} opp={o} onOpen={setSelected} />
              ))}
            </div>
            {query.hasNextPage && (
              <div className="mt-8 flex justify-center">
                <Button
                  variant="outline"
                  size="lg"
                  disabled={query.isFetchingNextPage}
                  onClick={() => void query.fetchNextPage()}
                >
                  {query.isFetchingNextPage && <Loader2 className="animate-spin" />}
                  {t("explore.loadMore")}
                </Button>
              </div>
            )}
          </>
        )}
      </section>
      <OpportunityDialog opp={selected} onClose={() => setSelected(null)} />
    </>
  );
}
