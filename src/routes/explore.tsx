import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import { Search, SlidersHorizontal, X, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { categories, innovations, institutions, getInnovator, getInstitution, type CategoryId, type Stage } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { CategoryIcon, PageIntro } from "@/components/site/bits";
import { InnovationCard } from "@/components/site/cards";

type Sort = "latest" | "popular" | "discussed";
interface ExploreSearch {
  q?: string;
  category?: CategoryId;
  stage?: Stage;
  institution?: string;
  sort?: Sort;
}

const stages: Stage[] = ["concept", "prototype", "pilot", "market"];
const catIds = categories.map((c) => c.id) as string[];

export const Route = createFileRoute("/explore")({
  validateSearch: (s: Record<string, unknown>): ExploreSearch => ({
    q: typeof s.q === "string" && s.q ? s.q : undefined,
    category: typeof s.category === "string" && catIds.includes(s.category) ? (s.category as CategoryId) : undefined,
    stage: typeof s.stage === "string" && (stages as string[]).includes(s.stage) ? (s.stage as Stage) : undefined,
    institution: typeof s.institution === "string" && s.institution ? s.institution : undefined,
    sort: s.sort === "popular" || s.sort === "discussed" ? s.sort : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Explore Innovations – TIE Tanzania Innovation Ecosystem" },
      { name: "description", content: "Search and filter Tanzanian innovations by sector, stage and institution — from agritech and health to energy and AI." },
      { property: "og:title", content: "Explore Tanzanian Innovations – TIE" },
      { property: "og:description", content: "Discover projects built by Tanzanian innovators across every sector and region." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ExplorePage,
});

const PAGE = 6;

function ExplorePage() {
  const { t, lang } = usePrefs();
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/explore" });
  const [limit, setLimit] = useState(PAGE);
  const [showFilters, setShowFilters] = useState(false);
  const [query, setQuery] = useState(search.q ?? "");
  const sort: Sort = search.sort ?? "latest";

  const update = (patch: Partial<ExploreSearch>) => {
    setLimit(PAGE);
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  };

  const results = useMemo(() => {
    const q = (search.q ?? "").toLowerCase();
    const list = innovations.filter((i) => {
      if (search.category && i.category !== search.category) return false;
      if (search.stage && i.stage !== search.stage) return false;
      if (search.institution && i.institution !== search.institution) return false;
      if (q) {
        const hay = [i.title, i.tagline, i.description, i.region, ...i.tech, getInnovator(i.creator)?.name ?? "", getInstitution(i.institution)?.name ?? ""]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return list.sort((a, b) =>
      sort === "popular" ? b.likes - a.likes : sort === "discussed" ? b.comments - a.comments : b.publishedAt.localeCompare(a.publishedAt),
    );
  }, [search, sort]);

  const clearAll = () => {
    setQuery("");
    update({ q: undefined, category: undefined, stage: undefined, institution: undefined });
  };

  const activeCount = [search.category, search.stage, search.institution, search.q].filter(Boolean).length;
  const selectCls =
    "h-11 w-full appearance-none rounded-xl border bg-card px-3.5 pr-9 text-sm font-medium text-foreground shadow-card outline-none focus:ring-2 focus:ring-ring bg-[length:16px] bg-[right_0.75rem_center] bg-no-repeat";

  return (
    <>
      <PageIntro eyebrow="TIE" title={t("explore.title")} body={t("explore.body")}>
        <div className="mt-8 flex max-w-2xl items-center gap-2 rounded-2xl border bg-background p-1.5 shadow-card focus-within:ring-2 focus-within:ring-ring">
          <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="explore-q" className="sr-only">{t("explore.search")}</label>
          <input
            id="explore-q"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              update({ q: e.target.value || undefined });
            }}
            placeholder={t("explore.search")}
            className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] text-foreground outline-none placeholder:text-muted-foreground"
          />
        </div>
      </PageIntro>

      <section className="container-tie py-8 sm:py-10">
        {/* Category chips */}
        <div className="-mx-5 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
          <Chip active={!search.category} onClick={() => update({ category: undefined })}>{t("explore.allCategories")}</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={search.category === c.id} onClick={() => update({ category: search.category === c.id ? undefined : c.id })}>
              <CategoryIcon id={c.id} className="size-3.5" /> {lang === "sw" ? c.sw : c.en}
            </Chip>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            <strong className="text-foreground">{results.length}</strong> {t("explore.results")}
          </p>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="md:hidden" onClick={() => setShowFilters((s) => !s)} aria-expanded={showFilters}>
              <SlidersHorizontal /> {t("explore.filters")}
            </Button>
            {activeCount > 0 && (
              <Button variant="ghost" size="sm" onClick={() => clearAll()}>
                <X /> {t("explore.clear")}
              </Button>
            )}
          </div>
        </div>

        <div className={cn("mt-4 grid gap-3 sm:grid-cols-3", showFilters ? "grid" : "hidden md:grid")}>
          <label className="block">
            <span className="sr-only">{t("explore.allStages")}</span>
            <select className={selectCls} value={search.stage ?? ""} onChange={(e) => update({ stage: (e.target.value || undefined) as Stage | undefined })}>
              <option value="">{t("explore.allStages")}</option>
              {stages.map((s) => <option key={s} value={s}>{t(`stage.${s}`)}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">{t("explore.allInstitutions")}</span>
            <select className={selectCls} value={search.institution ?? ""} onChange={(e) => update({ institution: e.target.value || undefined })}>
              <option value="">{t("explore.allInstitutions")}</option>
              {institutions.map((i) => <option key={i.slug} value={i.slug}>{i.short} – {i.name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="sr-only">Sort</span>
            <select className={selectCls} value={sort} onChange={(e) => update({ sort: e.target.value === "latest" ? undefined : (e.target.value as Sort) })}>
              <option value="latest">{t("explore.sort.latest")}</option>
              <option value="popular">{t("explore.sort.popular")}</option>
              <option value="discussed">{t("explore.sort.discussed")}</option>
            </select>
          </label>
        </div>

        {results.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-3xl border border-dashed bg-card px-6 py-16 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-secondary text-muted-foreground"><SearchX className="size-6" /></span>
            <h2 className="mt-5 text-lg font-semibold text-foreground">{t("explore.empty.title")}</h2>
            <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("explore.empty.body")}</p>
            <Button className="mt-6" variant="outline" onClick={() => clearAll()}>
              {t("explore.clear")}
            </Button>
          </div>
        ) : (
          <>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {results.slice(0, limit).map((i, idx) => <InnovationCard key={i.slug} item={i} priority={idx < 3} />)}
            </div>
            {limit < results.length && (
              <div className="mt-10 flex justify-center">
                <Button variant="outline" size="lg" onClick={() => setLimit((l) => l + PAGE)}>{t("explore.loadMore")}</Button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-[0.8rem] font-semibold transition-colors",
        active ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:border-foreground/25 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
