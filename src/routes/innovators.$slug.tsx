import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft, MapPin, Building2, UserPlus, UserCheck, Handshake, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getInnovator, getInstitution, innovations } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { Avatar, CategoryIcon, useCategoryLabel } from "@/components/site/bits";
import { InnovationCard } from "@/components/site/cards";

export const Route = createFileRoute("/innovators/$slug")({
  loader: ({ params }) => {
    const person = getInnovator(params.slug);
    if (!person) throw notFound();
    return { person };
  },
  head: ({ loaderData }) => {
    const p = loaderData?.person;
    if (!p) return { meta: [{ title: "Profile unavailable – TIE" }, { name: "robots", content: "noindex" }] };
    return {
      meta: [
        { title: `${p.name} – ${p.headline} | TIE` },
        { name: "description", content: p.bio },
        { property: "og:title", content: `${p.name} on TIE – Tanzania Innovation Ecosystem` },
        { property: "og:description", content: p.headline },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-tie py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">Profile not found</h1>
      <Button asChild className="mt-6"><Link to="/innovators">All innovators</Link></Button>
    </div>
  ),
  component: ProfilePage,
});

function ProfilePage() {
  const { person } = Route.useLoaderData();
  const { t, saved, toggleSave, lang } = usePrefs();
  const catLabel = useCategoryLabel();
  const inst = getInstitution(person.institution);
  const projects = innovations.filter((i) => i.team.includes(person.slug));
  const following = saved.has(`follow:${person.slug}`);

  return (
    <>
      <section className="relative">
        <div className="h-40 bg-navy-gradient sm:h-52">
          <div className="h-full w-full bg-grid opacity-60" />
        </div>
        <div className="container-tie">
          <div className="-mt-16 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar name={person.name} photo={person.photo} className="size-32 shrink-0 rounded-3xl border-4 border-background text-3xl shadow-lift sm:size-40" />
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">{person.name}</h1>
                <p className="mt-1 text-muted-foreground">{person.headline}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin className="size-4" />{person.location}</span>
                  {inst && <span className="inline-flex items-center gap-1"><Building2 className="size-4" />{inst.name}</span>}
                </p>
              </div>
            </div>
            <div className="flex gap-2 pb-1">
              <Button
                variant={following ? "outline" : "default"}
                onClick={() => {
                  const on = toggleSave(`follow:${person.slug}`);
                  toast.success(on ? (lang === "sw" ? `Unamfuata ${person.name}` : `Following ${person.name} on this device`) : lang === "sw" ? "Umeacha kufuata" : "Unfollowed");
                }}
              >
                {following ? <UserCheck /> : <UserPlus />} {following ? (lang === "sw" ? "Unafuata" : "Following") : lang === "sw" ? "Fuata" : "Follow"}
              </Button>
              <Button asChild variant="gold"><Link to="/auth" search={{ mode: "join" }}><Handshake /> Collaborate</Link></Button>
            </div>
          </div>
        </div>
      </section>

      <div className="container-tie grid gap-8 py-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{person.bio}</p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-center">
              <div><p className="font-display text-xl font-bold text-foreground">{projects.length}</p><p className="text-xs text-muted-foreground">{t("common.projects")}</p></div>
              <div><p className="font-display text-xl font-bold text-foreground">{(person.followers + (following ? 1 : 0)).toLocaleString("en")}</p><p className="text-xs text-muted-foreground">{t("common.followers")}</p></div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.skills.map((s) => <span key={s} className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">{s}</span>)}
            </div>
            <h2 className="mt-5 text-sm font-semibold text-foreground">Areas of interest</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.interests.map((c) => (
                <Link key={c} to="/explore" search={{ category: c }} className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-foreground hover:border-gold">
                  <CategoryIcon id={c} className="size-3.5" />{catLabel(c)}
                </Link>
              ))}
            </div>
            <h2 className="mt-5 text-sm font-semibold text-foreground">Open to collaborate on</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {person.lookingFor.map((x) => <li key={x} className="flex items-center gap-2"><span className="size-1.5 rounded-full bg-gold" />{x}</li>)}
            </ul>
            {person.links.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {person.links.map((l) => (
                  <a key={l.label} href={l.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sm font-medium text-azure hover:underline">{l.label}<ExternalLink className="size-3.5" /></a>
                ))}
              </div>
            )}
          </div>
        </aside>
        <section className="min-w-0">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Innovations</h2>
            <Link to="/innovators" className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />{t("nav.innovators")}</Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {projects.map((i) => <InnovationCard key={i.slug} item={i} />)}
          </div>
        </section>
      </div>
    </>
  );
}
