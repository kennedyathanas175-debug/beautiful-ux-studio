import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, Search, UserX } from "lucide-react";
import { categories, type CategoryId } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PageIntro } from "@/components/site/bits";
import { InnovatorCard } from "@/components/site/cards";
import { ErrorState, GridSkeleton } from "@/components/site/states";
import { photos } from "@/data/photos";
import { Button } from "@/components/ui/button";
import { useInfiniteInnovators } from "@/lib/queries";

export const Route = createFileRoute("/innovators/")({
  head: () => ({
    meta: [
      { title: "Innovators – TIE Tanzania Innovation Ecosystem" },
      {
        name: "description",
        content:
          "Meet Tanzanian engineers, researchers, founders and students building innovations across the country.",
      },
      { property: "og:title", content: "Tanzanian Innovators – TIE" },
      {
        property: "og:description",
        content: "Professional profiles of the people behind Tanzania's innovations.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InnovatorsPage,
});

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timeout = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timeout);
  }, [value, delay]);
  return debounced;
}

function InnovatorsPage() {
  const { t, lang } = usePrefs();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<CategoryId | null>(null);
  const debounced = useDebouncedValue(q.trim());
  const query = useInfiniteInnovators({
    q: debounced || undefined,
    category: cat ?? undefined,
  });
  const list = query.data?.pages.flatMap((page) => page.results) ?? [];
  const total = query.data?.pages[0]?.count ?? 0;

  return (
    <>
      <PageIntro
        eyebrow={t("nav.innovators")}
        title={t("nav.innovators")}
        body={t("sec.innovators.body")}
        photo={photos.arusha}
      >
        <div className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border bg-background p-1.5 shadow-card focus-within:ring-2 focus-within:ring-ring">
          <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="inn-q" className="sr-only">
            Search innovators
          </label>
          <input
            id="inn-q"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              lang === "sw"
                ? "Tafuta kwa jina, ujuzi au mahali"
                : "Search by name, skill or location"
            }
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </PageIntro>
      <section className="container-tie py-10">
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          {[null, ...categories.map((c) => c.id)].map((id) => {
            const c = id ? categories.find((x) => x.id === id)! : null;
            const active = cat === id;
            return (
              <button
                key={id ?? "all"}
                type="button"
                aria-pressed={active}
                onClick={() => setCat(id)}
                className={cn(
                  "h-9 shrink-0 rounded-full border px-3.5 text-[0.8rem] font-semibold transition-colors",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground",
                )}
              >
                {c ? (lang === "sw" ? c.sw : c.en) : t("explore.allCategories")}
              </button>
            );
          })}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          <strong className="text-foreground">{total}</strong> {t("common.innovators")}
        </p>

        {query.isError ? (
          <ErrorState
            message="The innovator directory could not be loaded."
            onRetry={() => void query.refetch()}
          />
        ) : query.isLoading ? (
          <div className="mt-8">
            <GridSkeleton />
          </div>
        ) : list.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-16 text-center">
            <UserX className="size-8 text-muted-foreground" />
            <p className="mt-4 font-semibold text-foreground">
              {lang === "sw" ? "Hakuna wabunifu waliopatikana" : "No innovators found"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">{t("explore.empty.body")}</p>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {list.map((p) => (
                <InnovatorCard key={p.slug} person={p} />
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
