import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Search, Sparkles, Users, Rocket, Handshake, BadgeCheck, MapPin, TrendingUp, Lightbulb, Building2, Map } from "lucide-react";
import heroImg from "@/assets/hero-innovators.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { categories, impactStats, innovations, innovators, institutions, opportunities, getInnovator, getInstitution, type Opportunity } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { CategoryIcon, SectionHeader, StageBadge, Avatar, useCategoryLabel } from "@/components/site/bits";
import { InnovationCard, InnovatorCard, OpportunityCard, TrendingRow, InstitutionMonogram, LikeSaveActions } from "@/components/site/cards";
import { OpportunityDialog } from "@/components/site/OpportunityDialog";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIE – Tanzania Innovation Ecosystem | Discover. Connect. Innovate." },
      {
        name: "description",
        content:
          "Discover Tanzanian innovations, connect with innovators and institutions, and find challenges, grants and programs across the national innovation ecosystem.",
      },
      { property: "og:title", content: "TIE – Tanzania Innovation Ecosystem" },
      {
        property: "og:description",
        content: "Discover. Connect. Innovate. Transform Tanzania. The national platform for innovators, researchers and institutions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  const [opp, setOpp] = useState<Opportunity | null>(null);
  return (
    <>
      <Hero />
      <InstitutionStrip />
      <Featured />
      <Categories />
      <Trending />
      <Impact />
      <FeaturedInnovators />
      <Opportunities onOpen={setOpp} />
      <JoinCta />
      <OpportunityDialog opp={opp} onClose={() => setOpp(null)} />
    </>
  );
}

function Hero() {
  const { t } = usePrefs();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const popular = ["Solar", "Agritech", "Kiswahili AI", "Telemedicine"];
  const piloting = innovations[0];

  return (
    <section className="relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-70 [mask-image:radial-gradient(ellipse_at_top_left,black,transparent_65%)]" />
      <div className="container-tie relative grid items-center gap-12 pb-16 pt-10 sm:pt-14 lg:grid-cols-[1.05fr_1fr] lg:gap-14 lg:pb-24 lg:pt-20">
        <div className="animate-fade-up">
          <Badge variant="gold" className="px-3 py-1 text-[0.72rem]">
            <Sparkles className="size-3.5" />
            {t("hero.badge")}
          </Badge>
          <h1 className="mt-5 text-[2.35rem] font-extrabold leading-[1.05] text-foreground sm:text-6xl lg:text-[4.1rem]">
            {t("hero.title.1")}{" "}
            <span className="relative inline-block text-navy dark:text-gold">
              {t("hero.title.2")}
              <svg className="absolute -bottom-2 left-0 h-3 w-full text-gold" viewBox="0 0 300 12" preserveAspectRatio="none" aria-hidden>
                <path d="M2 9C60 3 140 2 298 7" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="round" />
              </svg>
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">{t("hero.body")}</p>

          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/explore", search: q.trim() ? { q: q.trim() } : {} });
            }}
            className="mt-8 flex max-w-xl items-center gap-2 rounded-2xl border bg-card p-1.5 shadow-card focus-within:ring-2 focus-within:ring-ring"
          >
            <Search className="ml-3 size-5 shrink-0 text-muted-foreground" aria-hidden />
            <label htmlFor="hero-search" className="sr-only">{t("hero.search")}</label>
            <input
              id="hero-search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("hero.search")}
              className="h-11 min-w-0 flex-1 bg-transparent text-[0.95rem] text-foreground outline-none placeholder:text-muted-foreground"
            />
            <Button type="submit" size="default" className="h-11 shrink-0 px-4" aria-label="Search">
              <ArrowRight />
            </Button>
          </form>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">{t("hero.popular")}</span>
            {popular.map((p) => (
              <Link
                key={p}
                to="/explore"
                search={{ q: p.split(" ")[0] }}
                className="rounded-full border bg-card px-3 py-1 text-xs font-medium text-foreground transition-colors hover:border-gold hover:text-foreground"
              >
                {p}
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button asChild size="lg" variant="default">
              <Link to="/explore">
                {t("hero.cta.explore")} <ArrowRight />
              </Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link to="/auth" search={{ mode: "join" }}>{t("hero.cta.join")}</Link>
            </Button>
          </div>
        </div>

        {/* Visual */}
        <div className="relative animate-fade-up [animation-delay:120ms]">
          <div className="absolute -inset-4 -z-10 rounded-[2.5rem] bg-navy-gradient opacity-[0.07] blur-2xl dark:opacity-40" />
          <div className="relative overflow-hidden rounded-[1.75rem] border bg-muted shadow-lift">
            <img src={heroImg} alt="Tanzanian innovators collaborating on a solar prototype" width={1600} height={1200} className="aspect-[4/3.6] w-full object-cover sm:aspect-[4/3.4]" />
            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-navy/80 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between gap-3 text-navy-foreground">
              <div className="min-w-0">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.18em] text-gold">Dar es Salaam</p>
                <p className="mt-1 truncate font-display text-sm font-semibold sm:text-base">Buni pamoja · Build together</p>
              </div>
              <div className="flex shrink-0 -space-x-2">
                {innovators.slice(0, 4).map((p) => (
                  <Avatar key={p.slug} name={p.name} photo={p.photo} className="size-8 rounded-full border-2 border-navy text-[0.6rem]" />
                ))}
              </div>
            </div>
          </div>

          {/* Floating: piloting project */}
          <Link
            to="/innovations/$slug"
            params={{ slug: piloting.slug }}
            className="absolute -left-2 top-6 hidden w-60 rounded-2xl border bg-card/95 p-3 shadow-lift backdrop-blur transition-transform hover:-translate-y-0.5 sm:block lg:-left-10"
          >
            <div className="flex items-center gap-3">
              <img src={piloting.image} alt="" width={1200} height={800} className="size-11 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-wider text-success">● {t("hero.card.live")}</p>
                <p className="truncate text-sm font-semibold text-foreground">{piloting.title}</p>
                <p className="truncate text-xs text-muted-foreground">{piloting.region}</p>
              </div>
            </div>
          </Link>

          {/* Floating: collaboration */}
          <div className="absolute -bottom-6 right-3 w-64 rounded-2xl border bg-card/95 p-3.5 shadow-lift backdrop-blur sm:-right-4 lg:-right-8">
            <div className="flex items-center gap-2 text-xs font-semibold text-azure">
              <Handshake className="size-4" /> {t("hero.card.collab")}
            </div>
            <div className="mt-2.5 flex items-center gap-2.5">
              <Avatar name={innovators[2].name} photo={innovators[2].photo} className="size-8 shrink-0 rounded-full" />
              <p className="min-w-0 text-xs leading-snug text-muted-foreground">
                <span className="font-semibold text-foreground">{innovators[2].name}</span> → AfyaLink
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function InstitutionStrip() {
  const { t } = usePrefs();
  const row = [...institutions, ...institutions];
  return (
    <section aria-label={t("sec.institutions.title")} className="border-y bg-card py-6">
      <div className="container-tie flex flex-col gap-4 md:flex-row md:items-center md:gap-8">
        <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">{t("sec.institutions.title")}</p>
        <div className="relative min-w-0 flex-1 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <div className="flex w-max animate-marquee gap-8 hover:[animation-play-state:paused]">
            {row.map((inst, i) => (
              <Link key={inst.slug + i} to="/explore" search={{ institution: inst.slug }} className="flex shrink-0 items-center gap-2.5 opacity-80 transition-opacity hover:opacity-100">
                <InstitutionMonogram inst={inst} className="size-9 text-[0.62rem]" />
                <span className="whitespace-nowrap text-sm font-semibold text-foreground">{inst.short}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Featured() {
  const { t } = usePrefs();
  const catLabel = useCategoryLabel();
  const featured = innovations.filter((i) => i.featured);
  const [spot, ...rest] = featured;
  const creator = getInnovator(spot.creator)!;
  const inst = getInstitution(spot.institution);
  return (
    <section className="container-tie py-16 sm:py-24">
      <SectionHeader
        eyebrow={t("sec.featured.eyebrow")}
        title={t("sec.featured.title")}
        body={t("sec.featured.body")}
        action={
          <Button asChild variant="outline">
            <Link to="/explore">{t("common.viewAll")} <ArrowRight /></Link>
          </Button>
        }
      />
      {/* Spotlight */}
      <Link
        to="/innovations/$slug"
        params={{ slug: spot.slug }}
        className="group card-interactive grid overflow-hidden rounded-3xl border bg-card shadow-card md:grid-cols-[1.15fr_1fr]"
      >
        <div className="relative aspect-[16/10] overflow-hidden md:aspect-auto">
          <img src={spot.image} alt={spot.title} width={1200} height={800} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
          <Badge variant="glass" className="absolute left-4 top-4">
            <CategoryIcon id={spot.category} className="size-3" /> {catLabel(spot.category)}
          </Badge>
        </div>
        <div className="flex flex-col p-6 sm:p-8 lg:p-10">
          <div className="flex items-center gap-2">
            <StageBadge stage={spot.stage} />
            <span className="text-xs text-muted-foreground">· {spot.region}</span>
          </div>
          <h3 className="mt-4 text-2xl font-bold text-foreground group-hover:text-azure sm:text-3xl">{spot.title}</h3>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{spot.description}</p>
          <div className="mt-5 flex flex-wrap gap-1.5">
            {spot.tech.map((x) => (
              <span key={x} className="rounded-md border bg-surface px-2 py-1 text-xs font-medium text-foreground">{x}</span>
            ))}
          </div>
          <div className="mt-auto flex items-center justify-between gap-3 border-t pt-5 mt-8">
            <div className="flex min-w-0 items-center gap-3">
              <Avatar name={creator.name} photo={creator.photo} className="size-10 shrink-0 rounded-full" />
              <div className="min-w-0 leading-tight">
                <p className="truncate text-sm font-semibold text-foreground">{creator.name}</p>
                <p className="truncate text-xs text-muted-foreground">{inst?.name}</p>
              </div>
            </div>
            <LikeSaveActions id={spot.slug} likes={spot.likes} />
          </div>
        </div>
      </Link>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((i) => (
          <InnovationCard key={i.slug} item={i} />
        ))}
      </div>
    </section>
  );
}

function Categories() {
  const { t, lang } = usePrefs();
  return (
    <section className="border-y bg-card py-16 sm:py-20">
      <div className="container-tie">
        <SectionHeader eyebrow={t("sec.categories.eyebrow")} title={t("sec.categories.title")} />
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          {categories.map((c) => {
            const count = innovations.filter((i) => i.category === c.id).length;
            return (
              <Link
                key={c.id}
                to="/explore"
                search={{ category: c.id }}
                className="group flex flex-col gap-4 rounded-2xl border bg-background p-4 transition-all hover:-translate-y-0.5 hover:border-gold hover:shadow-card sm:flex-row sm:items-center sm:p-5"
              >
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy text-navy-foreground transition-colors group-hover:bg-gold group-hover:text-gold-foreground">
                  <CategoryIcon id={c.id} className="size-5" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground sm:text-[0.95rem]">{lang === "sw" ? c.sw : c.en}</span>
                  <span className="text-xs text-muted-foreground">{count} {t("common.innovations")}</span>
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function Trending() {
  const { t } = usePrefs();
  const trending = [...innovations].filter((i) => i.trending).sort((a, b) => b.views - a.views).slice(0, 6);
  return (
    <section className="container-tie py-16 sm:py-24">
      <SectionHeader
        eyebrow={t("sec.trending.eyebrow")}
        title={t("sec.trending.title")}
        action={
          <Button asChild variant="ghost">
            <Link to="/explore" search={{ sort: "popular" }}><TrendingUp /> {t("common.viewAll")}</Link>
          </Button>
        }
      />
      <div className="grid gap-x-8 gap-y-1 rounded-3xl border bg-card p-3 shadow-card md:grid-cols-2 sm:p-4">
        {trending.map((i, idx) => (
          <TrendingRow key={i.slug} item={i} rank={idx + 1} />
        ))}
      </div>
    </section>
  );
}

function Impact() {
  const { t } = usePrefs();
  const fmt = new Intl.NumberFormat("en");
  const stats = [
    { icon: Lightbulb, value: impactStats.innovations, label: t("stats.innovations") },
    { icon: Users, value: impactStats.innovators, label: t("stats.innovators") },
    { icon: Building2, value: impactStats.institutions, label: t("stats.institutions") },
    { icon: Map, value: impactStats.regions, label: t("stats.regions") },
  ];
  const steps = [
    { icon: Rocket, title: t("how.1.title"), body: t("how.1.body") },
    { icon: Handshake, title: t("how.2.title"), body: t("how.2.body") },
    { icon: TrendingUp, title: t("how.3.title"), body: t("how.3.body") },
  ];
  return (
    <section className="relative overflow-hidden bg-navy-gradient py-16 text-navy-foreground sm:py-24">
      <div className="pointer-events-none absolute inset-0 bg-grid [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />
      <div className="pointer-events-none absolute -right-32 -top-32 size-96 rounded-full bg-gold/20 blur-3xl" />
      <div className="container-tie relative">
        <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{t("sec.impact.eyebrow")}</p>
        <h2 className="mt-2 max-w-2xl text-2xl font-bold sm:text-4xl">{t("sec.impact.title")}</h2>
        <div className="mt-10 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-navy-foreground/10 bg-navy-foreground/10 lg:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-navy/60 p-5 backdrop-blur sm:p-7">
              <s.icon className="size-5 text-gold" aria-hidden />
              <p className="mt-4 font-display text-3xl font-bold sm:text-4xl">{fmt.format(s.value)}+</p>
              <p className="mt-1 text-sm text-navy-foreground/70">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{t("sec.how.eyebrow")}</p>
          <h3 className="mt-2 text-xl font-bold sm:text-2xl">{t("sec.how.title")}</h3>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((s, i) => (
              <li key={s.title} className="relative rounded-2xl border border-navy-foreground/10 bg-navy-foreground/[0.04] p-6">
                <span className="absolute right-5 top-4 font-display text-5xl font-extrabold text-navy-foreground/[0.07]">0{i + 1}</span>
                <span className="grid size-11 place-items-center rounded-xl bg-gold text-gold-foreground">
                  <s.icon className="size-5" />
                </span>
                <p className="mt-5 text-lg font-semibold">{s.title}</p>
                <p className="mt-2 text-sm leading-relaxed text-navy-foreground/70">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

function FeaturedInnovators() {
  const { t } = usePrefs();
  return (
    <section className="container-tie py-16 sm:py-24">
      <SectionHeader
        eyebrow={t("sec.innovators.eyebrow")}
        title={t("sec.innovators.title")}
        body={t("sec.innovators.body")}
        action={
          <Button asChild variant="outline">
            <Link to="/innovators">{t("common.viewAll")} <ArrowRight /></Link>
          </Button>
        }
      />
      <div className="-mx-5 flex snap-x snap-mandatory gap-4 overflow-x-auto px-5 pb-2 scrollbar-none sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
        {innovators.slice(0, 4).map((p) => (
          <div key={p.slug} className="w-[80%] shrink-0 snap-start sm:w-auto">
            <InnovatorCard person={p} />
          </div>
        ))}
      </div>
    </section>
  );
}

function Opportunities({ onOpen }: { onOpen: (o: Opportunity) => void }) {
  const { t } = usePrefs();
  return (
    <section className="border-t bg-card py-16 sm:py-24">
      <div className="container-tie">
        <SectionHeader
          eyebrow={t("sec.opps.eyebrow")}
          title={t("sec.opps.title")}
          body={t("sec.opps.body")}
          action={
            <Button asChild variant="outline">
              <Link to="/opportunities">{t("common.viewAll")} <ArrowRight /></Link>
            </Button>
          }
        />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.slice(0, 3).map((o) => (
            <OpportunityCard key={o.id} opp={o} onOpen={onOpen} />
          ))}
        </div>
      </div>
    </section>
  );
}

function JoinCta() {
  const { t } = usePrefs();
  return (
    <section className="container-tie py-16 sm:py-24">
      <div className="relative overflow-hidden rounded-[2rem] bg-navy-gradient px-6 py-12 text-navy-foreground sm:px-12 sm:py-16">
        <div className="pointer-events-none absolute inset-0 bg-grid opacity-60 [mask-image:linear-gradient(to_left,black,transparent)]" />
        <div className="absolute inset-x-0 top-0 h-1 flag-stripe" aria-hidden />
        <div className="relative grid gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-center">
          <div>
            <h2 className="text-2xl font-bold leading-tight sm:text-4xl">{t("cta.title")}</h2>
            <p className="mt-4 max-w-xl text-navy-foreground/75">{t("cta.body")}</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="gold">
                <Link to="/auth" search={{ mode: "join" }}>{t("nav.join")} <ArrowRight /></Link>
              </Button>
              <Button asChild size="lg" variant="onNavy">
                <Link to="/about">{t("nav.about")}</Link>
              </Button>
            </div>
          </div>
          <ul className="grid gap-3 text-sm">
            {[
              { icon: BadgeCheck, text: "Verified institutions & profiles" },
              { icon: MapPin, text: "Innovators from all 26 regions" },
              { icon: Handshake, text: "Your work, your ownership — always" },
            ].map((x) => (
              <li key={x.text} className="flex items-center gap-3 rounded-xl border border-navy-foreground/10 bg-navy-foreground/[0.05] px-4 py-3">
                <x.icon className="size-4 shrink-0 text-gold" /> {x.text}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
