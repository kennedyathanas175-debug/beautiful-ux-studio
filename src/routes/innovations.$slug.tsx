import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, Target, Lightbulb, AlertTriangle, Wrench, Handshake, MapPin, Eye, MessageCircle, Share2, BadgeCheck, ExternalLink, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { getInnovation, getInnovator, getInstitution, innovations } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { Avatar, CategoryIcon, StageBadge, useCategoryLabel } from "@/components/site/bits";
import { InnovationCard, LikeSaveActions } from "@/components/site/cards";

export const Route = createFileRoute("/innovations/$slug")({
  loader: ({ params }) => {
    const item = getInnovation(params.slug);
    if (!item) throw notFound();
    return { item };
  },
  head: ({ loaderData }) => {
    const item = loaderData?.item;
    if (!item) return { meta: [{ title: "Innovation not found – TIE" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${item.title} – ${item.tagline} | TIE` },
        { name: "description", content: item.description },
        { property: "og:title", content: `${item.title} – TIE Tanzania Innovation Ecosystem` },
        { property: "og:description", content: item.tagline },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-tie py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">Innovation not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been moved or unpublished.</p>
      <Button asChild className="mt-6"><Link to="/explore">Explore innovations</Link></Button>
    </div>
  ),
  component: InnovationPage,
});

function InnovationPage() {
  const { item } = Route.useLoaderData();
  const { t, lang } = usePrefs();
  const catLabel = useCategoryLabel();
  const creator = getInnovator(item.creator)!;
  const inst = getInstitution(item.institution);
  const team = item.team.map(getInnovator).filter(Boolean);
  const related = innovations.filter((i) => i.slug !== item.slug && (i.category === item.category || i.institution === item.institution)).slice(0, 3);
  const fallback = related.length < 3 ? innovations.filter((i) => i.slug !== item.slug && !related.includes(i)).slice(0, 3 - related.length) : [];
  const published = new Date(item.publishedAt).toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-GB", { day: "numeric", month: "short", year: "numeric" });

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) await navigator.share({ title: item.title, text: item.tagline, url });
      else {
        await navigator.clipboard.writeText(url);
        toast.success(lang === "sw" ? "Kiungo kimenakiliwa" : "Link copied");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <article>
      {/* Cover */}
      <div className="relative">
        <div className="relative h-[42vh] min-h-[280px] overflow-hidden bg-navy sm:h-[52vh]">
          <img src={item.image} alt={item.title} width={1200} height={800} className="h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        </div>
        <div className="container-tie relative -mt-44 pb-2 text-navy-foreground sm:-mt-52">
          <Link to="/explore" className="inline-flex items-center gap-1.5 rounded-full bg-navy/50 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-navy/70">
            <ArrowLeft className="size-3.5" /> {t("nav.explore")}
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="glass"><CategoryIcon id={item.category} className="size-3" /> {catLabel(item.category)}</Badge>
            <StageBadge stage={item.stage} />
          </div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">{item.title}</h1>
          <p className="mt-2 max-w-2xl text-base text-navy-foreground/80 sm:text-lg">{item.tagline}</p>
        </div>
      </div>

      <div className="container-tie grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-14">
        {/* Main */}
        <div className="min-w-0 space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-card">
            <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1"><Eye className="size-4" />{item.views.toLocaleString("en")}</span>
              <span className="inline-flex items-center gap-1"><MessageCircle className="size-4" />{item.comments}</span>
              <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{item.region}</span>
              <span className="inline-flex items-center gap-1"><CalendarDays className="size-4" />{published}</span>
            </div>
            <div className="flex items-center gap-1">
              <LikeSaveActions id={item.slug} likes={item.likes} />
              <Button variant="ghost" size="icon-sm" onClick={share} aria-label="Share"><Share2 /></Button>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold text-foreground">Overview</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">{item.description}</p>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock icon={AlertTriangle} tone="warning" title="The problem" body={item.problem} />
            <InfoBlock icon={Lightbulb} tone="success" title="Our solution" body={item.solution} />
          </div>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground"><Target className="size-5 text-gold" /> Objectives</h2>
            <ol className="mt-4 space-y-3">
              {item.objectives.map((o, i) => (
                <li key={o} className="flex gap-4 rounded-xl border bg-card p-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-navy font-display text-xs font-bold text-navy-foreground">{i + 1}</span>
                  <span className="text-sm leading-relaxed text-foreground">{o}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground"><Wrench className="size-5 text-gold" /> Technology & tools</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tech.map((x) => (
                <Link key={x} to="/explore" search={{ q: x }} className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-gold">{x}</Link>
              ))}
            </div>
          </section>

          <section className="rounded-2xl border border-dashed bg-card p-6 text-center">
            <MessageCircle className="mx-auto size-6 text-muted-foreground" />
            <h2 className="mt-3 font-semibold text-foreground">{item.comments} comments in the discussion</h2>
            <p className="mt-1 text-sm text-muted-foreground">Join TIE to read the discussion, ask questions and give feedback to the team.</p>
            <Button asChild variant="outline" className="mt-4"><Link to="/auth" search={{ mode: "join" }}>{t("nav.join")}</Link></Button>
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created by</p>
            <Link to="/innovators/$slug" params={{ slug: creator.slug }} className="group mt-3 flex items-center gap-3">
              <Avatar name={creator.name} photo={creator.photo} className="size-12 shrink-0 rounded-xl" />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground group-hover:text-azure">{creator.name}</p>
                <p className="truncate text-xs text-muted-foreground">{creator.headline}</p>
              </div>
            </Link>
            <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">Ownership of this innovation remains with its creator.</p>
            <Button asChild variant="gold" size="lg" className="mt-4 w-full">
              <Link to="/auth" search={{ mode: "join" }}><Handshake /> Request collaboration</Link>
            </Button>
            {item.link && (
              <Button asChild variant="outline" className="mt-2 w-full">
                <a href={item.link} target="_blank" rel="noreferrer"><ExternalLink /> Project link</a>
              </Button>
            )}
          </div>

          {team.length > 1 && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Team</p>
              <ul className="mt-3 space-y-3">
                {team.map((m) => m && (
                  <li key={m.slug}>
                    <Link to="/innovators/$slug" params={{ slug: m.slug }} className="flex items-center gap-3 hover:text-azure">
                      <Avatar name={m.name} photo={m.photo} className="size-9 shrink-0 rounded-full text-xs" />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{m.name}</span>
                        <span className="block truncate text-xs text-muted-foreground">{m.headline}</span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {inst && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Institution</p>
              <p className="mt-2 flex items-start gap-1.5 font-semibold text-foreground">
                {inst.name} {inst.verified && <BadgeCheck className="mt-0.5 size-4 shrink-0 text-azure" />}
              </p>
              <p className="text-xs text-muted-foreground">{inst.location}</p>
              <Link to="/explore" search={{ institution: inst.slug }} className="mt-3 inline-block text-sm font-semibold text-azure hover:underline">
                More from {inst.short} →
              </Link>
            </div>
          )}
        </aside>
      </div>

      <section className="border-t bg-card py-14">
        <div className="container-tie">
          <h2 className="text-2xl font-bold text-foreground">Related innovations</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[...related, ...fallback].map((i) => <InnovationCard key={i.slug} item={i} />)}
          </div>
        </div>
      </section>
    </article>
  );
}

function InfoBlock({ icon: Icon, title, body, tone }: { icon: typeof Target; title: string; body: string; tone: "warning" | "success" }) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <span className={tone === "warning" ? "grid size-10 place-items-center rounded-xl bg-warning-soft text-warning" : "grid size-10 place-items-center rounded-xl bg-success-soft text-success"}>
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
