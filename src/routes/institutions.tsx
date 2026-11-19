import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, BadgeCheck, Building2 } from "lucide-react";
import { institutionTypes, type InstitutionType } from "@/data/catalog";
import { photos } from "@/data/photos";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PageIntro } from "@/components/site/bits";
import { InstitutionCard } from "@/components/site/cards";
import { ErrorState, GridSkeleton } from "@/components/site/states";
import { Button } from "@/components/ui/button";
import { useInfiniteInstitutions, useInstitutionStats } from "@/lib/queries";

export const Route = createFileRoute("/institutions")({
  head: () => ({
    meta: [
      { title: "Institutions – TIE Tanzania Innovation Ecosystem" },
      {
        name: "description",
        content:
          "Directory of Tanzanian universities, research institutions, innovation hubs and agencies taking part in TIE.",
      },
      { property: "og:title", content: "Participating Institutions – TIE" },
      {
        property: "og:description",
        content: "Universities, research bodies and innovation hubs across Tanzania.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstitutionsPage,
});

type TypeFilter = (typeof institutionTypes)[number] | "All";

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function InstitutionsPage() {
  const { t, lang } = usePrefs();
  const [q, setQ] = useState("");
  const [type, setType] = useState<TypeFilter>("All");
  const debounced = useDebouncedValue(q.trim());
  const query = useInfiniteInstitutions({
    q: debounced || undefined,
    type: type === "All" ? undefined : (type as InstitutionType),
  });
  const stats = useInstitutionStats();
  const list = query.data?.pages.flatMap((page) => page.results) ?? [];

  return (
    <>
      <PageIntro
        eyebrow={t("nav.institutions")}
        title={t("sec.institutions.title")}
        body={
          lang === "sw"
            ? "Vyuo vikuu, taasisi za utafiti, vituo vya ubunifu na mashirika yanayojenga mfumo wa ubunifu wa Tanzania."
            : "Universities, research institutions, innovation hubs and agencies building Tanzania's innovation ecosystem."
        }
        photo={photos.dodoma}
      >
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <span className="inline-flex items-center gap-2">
            <Building2 className="size-4 text-gold" />
            <strong>{stats.data?.total ?? "—"}</strong> {lang === "sw" ? "taasisi" : "institutions"}
          </span>
          <span className="inline-flex items-center gap-2">
            <BadgeCheck className="size-4 text-gold" />
            <strong>{stats.data?.verified ?? "—"}</strong> {t("common.verified").toLowerCase()}
          </span>
        </div>
      </PageIntro>
      <section className="container-tie py-10">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 shadow-card focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <label htmlFor="inst-q" className="sr-only">
              Search institutions
            </label>
            <input
              id="inst-q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={
                lang === "sw" ? "Tafuta taasisi au mahali" : "Search by name or location"
              }
              className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none md:mx-0 md:px-0">
            {(["All", ...institutionTypes] as TypeFilter[]).map((item) => (
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
        </div>
        {query.isError ? (
          <ErrorState
            message="The institution directory could not be loaded."
            onRetry={() => void query.refetch()}
          />
        ) : query.isLoading ? (
          <div className="mt-8">
            <GridSkeleton />
          </div>
        ) : list.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
            {lang === "sw"
              ? "Hakuna taasisi zinazolingana na utafutaji wako."
              : "No institutions match your search."}
          </p>
        ) : (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((i) => (
                <InstitutionCard key={i.slug} inst={i} />
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
    </>
  );
}
