import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Search, BadgeCheck, Building2 } from "lucide-react";
import { institutions, type Institution } from "@/data/catalog";
import { photos } from "@/data/photos";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { PageIntro } from "@/components/site/bits";
import { InstitutionCard } from "@/components/site/cards";

export const Route = createFileRoute("/institutions")({
  head: () => ({
    meta: [
      { title: "Institutions – TIE Tanzania Innovation Ecosystem" },
      { name: "description", content: "Directory of Tanzanian universities, research institutions, innovation hubs and agencies taking part in TIE." },
      { property: "og:title", content: "Participating Institutions – TIE" },
      { property: "og:description", content: "Universities, research bodies and innovation hubs across Tanzania." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: InstitutionsPage,
});

const types: (Institution["type"] | "All")[] = ["All", "University", "Research", "Innovation Hub", "Government"];

function InstitutionsPage() {
  const { t, lang } = usePrefs();
  const [q, setQ] = useState("");
  const [type, setType] = useState<(typeof types)[number]>("All");
  const list = useMemo(() => {
    const s = q.toLowerCase();
    return institutions.filter(
      (i) => (type === "All" || i.type === type) && (!s || [i.name, i.short, i.location, i.description].join(" ").toLowerCase().includes(s)),
    );
  }, [q, type]);
  const verified = institutions.filter((i) => i.verified).length;

  return (
    <>
      <PageIntro
        eyebrow={t("nav.institutions")}
        title={t("sec.institutions.title")}
        body={lang === "sw" ? "Vyuo vikuu, taasisi za utafiti, vituo vya ubunifu na mashirika yanayojenga mfumo wa ubunifu wa Tanzania." : "Universities, research institutions, innovation hubs and agencies building Tanzania's innovation ecosystem."}
        photo={photos.dodoma}
      >
        <div className="mt-6 flex flex-wrap gap-6 text-sm">
          <span className="inline-flex items-center gap-2"><Building2 className="size-4 text-gold" /><strong>{institutions.length}</strong> {lang === "sw" ? "taasisi" : "institutions"}</span>
          <span className="inline-flex items-center gap-2"><BadgeCheck className="size-4 text-gold" /><strong>{verified}</strong> {t("common.verified").toLowerCase()}</span>
        </div>
      </PageIntro>
      <section className="container-tie py-10">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
          <div className="flex items-center gap-2 rounded-md border bg-card px-3 shadow-card focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <label htmlFor="inst-q" className="sr-only">Search institutions</label>
            <input id="inst-q" value={q} onChange={(e) => setQ(e.target.value)} placeholder={lang === "sw" ? "Tafuta taasisi au mahali" : "Search by name or location"} className="h-11 min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </div>
          <div className="-mx-5 flex gap-2 overflow-x-auto px-5 scrollbar-none md:mx-0 md:px-0">
            {types.map((x) => (
              <button key={x} type="button" aria-pressed={type === x} onClick={() => setType(x)}
                className={cn("h-9 shrink-0 rounded-md border px-3 text-[0.8rem] font-semibold transition-colors", type === x ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground")}>
                {x === "All" ? (lang === "sw" ? "Zote" : "All") : x}
              </button>
            ))}
          </div>
        </div>
        {list.length === 0 ? (
          <p className="mt-10 rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">{lang === "sw" ? "Hakuna taasisi zinazolingana na utafutaji wako." : "No institutions match your search."}</p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((i) => <InstitutionCard key={i.slug} inst={i} />)}
          </div>
        )}
      </section>
    </>
  );
}
