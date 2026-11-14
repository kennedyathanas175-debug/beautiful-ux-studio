import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, CalendarX } from "lucide-react";
import { opportunities, daysUntil, type Opportunity, type OppType } from "@/data/catalog";
import { photos } from "@/data/photos";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PageIntro } from "@/components/site/bits";
import { OpportunityCard } from "@/components/site/cards";
import { OpportunityDialog } from "@/components/site/OpportunityDialog";

export const Route = createFileRoute("/opportunities")({
  head: () => ({
    meta: [
      { title: "Opportunities & Challenges – TIE Tanzania Innovation Ecosystem" },
      { name: "description", content: "Innovation challenges, hackathons, grants, research calls, internships and programs for Tanzanian innovators." },
      { property: "og:title", content: "Opportunities for Tanzanian Innovators – TIE" },
      { property: "og:description", content: "Challenges, grants and programs with deadlines and eligibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: OpportunitiesPage,
});

const types: (OppType | "All")[] = ["All", "Challenge", "Hackathon", "Grant", "Research", "Internship", "Program"];

function OpportunitiesPage() {
  const { t, lang } = usePrefs();
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("All");
  const [openOnly, setOpenOnly] = useState(true);
  const [selected, setSelected] = useState<Opportunity | null>(null);

  const list = useMemo(() => {
    const s = q.toLowerCase();
    return opportunities
      .filter((o) => (type === "All" || o.type === type) && (!openOnly || daysUntil(o.deadline) >= 0) && (!s || [o.title, o.summary, o.organizer, o.location].join(" ").toLowerCase().includes(s)))
      .sort((a, b) => a.deadline.localeCompare(b.deadline));
  }, [q, type, openOnly]);

  return (
    <>
      <PageIntro eyebrow={t("nav.opportunities")} title={t("sec.opps.title")} body={t("sec.opps.body")} photo={photos.stoneTown} />
      <section className="container-tie py-10">
        <div className="flex items-center gap-2 rounded-md border bg-card px-3 shadow-card focus-within:ring-2 focus-within:ring-ring">
          <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <label htmlFor="opp-q" className="sr-only">Search opportunities</label>
          <input id="opp-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "sw" ? "Tafuta fursa" : "Search opportunities"} className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none sm:mx-0 sm:flex-wrap sm:px-0">
            {types.map((x) => (
              <button key={x} type="button" aria-pressed={type === x} onClick={() => setType(x)}
                className={cn("h-9 shrink-0 rounded-md border px-3 text-[0.8rem] font-semibold transition-colors", type === x ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
                {x === "All" ? (lang === "sw" ? "Zote" : "All") : x}
              </button>
            ))}
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={openOnly} onChange={(e) => setOpenOnly(e.target.checked)} className="size-4 accent-primary" />
            {lang === "sw" ? "Zilizo wazi tu" : "Open only"}
          </label>
        </div>
        {list.length === 0 ? (
          <div className="mt-10 flex flex-col items-center rounded-lg border border-dashed bg-card p-12 text-center">
            <CalendarX className="size-8 text-muted-foreground" />
            <p className="mt-3 font-semibold text-foreground">{lang === "sw" ? "Hakuna fursa zinazolingana" : "No matching opportunities"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{t("explore.empty.body")}</p>
          </div>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((o) => <OpportunityCard key={o.id} opp={o} onOpen={setSelected} />)}
          </div>
        )}
      </section>
      <OpportunityDialog opp={selected} onClose={() => setSelected(null)} />
    </>
  );
}
