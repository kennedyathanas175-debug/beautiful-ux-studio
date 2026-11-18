import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowLeft,
  MapPin,
  Building2,
  UserPlus,
  UserCheck,
  Handshake,
  ExternalLink,
  Pencil,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import type { Innovator } from "@/lib/api-types";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { Avatar, CategoryIcon, useCategoryLabel } from "@/components/site/bits";
import { InnovationCard } from "@/components/site/cards";
import { CollaborationDialog } from "@/components/site/CollaborationDialog";
import { ErrorState, PageLoader } from "@/components/site/states";
import { fetchInnovatorForLoader, useInnovator } from "@/lib/queries";

export const Route = createFileRoute("/innovators/$slug")({
  loader: async ({ params }) => {
    try {
      const person = await fetchInnovatorForLoader(params.slug);
      return { person, loadError: false };
    } catch (error) {
      if ((error as { status?: number }).status === 404) throw notFound();
      return { person: null, loadError: true };
    }
  },
  head: ({ loaderData }) => {
    const person = loaderData?.person;
    if (!person)
      return {
        meta: [{ title: "Profile unavailable – TIE" }, { name: "robots", content: "noindex" }],
      };
    return {
      meta: [
        { title: `${person.name} – ${person.headline} | TIE` },
        { name: "description", content: person.bio },
        { property: "og:title", content: `${person.name} on TIE – Tanzania Innovation Ecosystem` },
        { property: "og:description", content: person.headline },
        { property: "og:type", content: "profile" },
        { property: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-tie py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">Profile not found</h1>
      <Button asChild className="mt-6">
        <Link to="/innovators">All innovators</Link>
      </Button>
    </div>
  ),
  errorComponent: () => <ErrorState title="This profile could not be loaded" />,
  component: ProfilePage,
});

function ProfilePage() {
  const { slug } = Route.useParams();
  const { person: initial, loadError } = Route.useLoaderData();
  const { t, lang } = usePrefs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const catLabel = useCategoryLabel();
  const query = useInnovator(slug, initial ?? undefined);
  const person = query.data;
  const [following, setFollowing] = useState(initial?.viewer.isFollowing ?? false);
  const [followers, setFollowers] = useState(initial?.followers ?? 0);
  const [followBusy, setFollowBusy] = useState(false);
  const [collaborate, setCollaborate] = useState(false);

  if (!person) {
    if (query.isLoading || (!loadError && query.isFetching))
      return <PageLoader label="Loading profile…" />;
    return <ErrorState title="This profile is unavailable" onRetry={() => void query.refetch()} />;
  }

  const projects = person.projects ?? [];
  const isSelf = user?.slug === person.slug;

  const toggleFollow = async () => {
    if (!user) {
      toast.info(lang === "sw" ? "Ingia ili kumfuata" : "Log in to follow innovators");
      void navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    if (followBusy) return;
    setFollowBusy(true);
    const next = !following;
    setFollowing(next);
    setFollowers((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      const result = await api.post<{ following: boolean; followers: number }>(
        `/auth/users/${person.slug}/follow/`,
      );
      setFollowing(result.following);
      setFollowers(result.followers);
      toast.success(result.following ? `Following ${person.name}` : "Unfollowed");
    } catch (error) {
      setFollowing(!next);
      setFollowers((value) => Math.max(0, value + (next ? -1 : 1)));
      toast.error(errorMessage(error));
    } finally {
      setFollowBusy(false);
    }
  };

  const startCollaboration = () => {
    if (!user) {
      toast.info("Log in to start a collaboration");
      void navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    setCollaborate(true);
  };

  return (
    <>
      <section className="relative">
        <div className="h-40 bg-navy-gradient sm:h-52">
          <div className="h-full w-full bg-grid opacity-60" />
        </div>
        <div className="container-tie">
          <div className="-mt-16 flex flex-col gap-5 sm:-mt-20 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
              <Avatar
                name={person.name}
                photo={person.photo ?? undefined}
                className="size-32 shrink-0 rounded-3xl border-4 border-background text-3xl shadow-lift sm:size-40"
              />
              <div className="min-w-0 pb-1">
                <h1 className="text-2xl font-extrabold text-foreground sm:text-3xl">
                  {person.name}
                </h1>
                <p className="mt-1 text-muted-foreground">{person.headline}</p>
                <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="size-4" />
                    {person.location}
                  </span>
                  {person.institution && (
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="size-4" />
                      {person.institution.name}
                    </span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              {isSelf ? (
                <Button asChild variant="outline">
                  <Link to="/dashboard/profile">
                    <Pencil /> Edit profile
                  </Link>
                </Button>
              ) : (
                <>
                  <Button
                    variant={following ? "outline" : "default"}
                    onClick={() => void toggleFollow()}
                    disabled={followBusy}
                  >
                    {followBusy ? (
                      <Loader2 className="animate-spin" />
                    ) : following ? (
                      <UserCheck />
                    ) : (
                      <UserPlus />
                    )}
                    {following
                      ? lang === "sw"
                        ? "Unafuata"
                        : "Following"
                      : lang === "sw"
                        ? "Fuata"
                        : "Follow"}
                  </Button>
                  <Button variant="gold" onClick={startCollaboration}>
                    <Handshake /> Collaborate
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-tie grid gap-8 py-10 lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="space-y-5">
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">About</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {person.bio || "This innovator has not added a bio yet."}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t pt-4 text-center">
              <div>
                <p className="font-display text-xl font-bold text-foreground">{projects.length}</p>
                <p className="text-xs text-muted-foreground">{t("common.projects")}</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-foreground">
                  {followers.toLocaleString("en")}
                </p>
                <p className="text-xs text-muted-foreground">{t("common.followers")}</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border bg-card p-5">
            <h2 className="text-sm font-semibold text-foreground">Skills</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.skills.length ? (
                person.skills.map((skill) => (
                  <span
                    key={skill}
                    className="rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
                  >
                    {skill}
                  </span>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No skills listed.</p>
              )}
            </div>
            <h2 className="mt-5 text-sm font-semibold text-foreground">Areas of interest</h2>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {person.interests.map((category) => (
                <Link
                  key={category}
                  to="/explore"
                  search={{ category }}
                  className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium text-foreground hover:border-gold"
                >
                  <CategoryIcon id={category} className="size-3.5" />
                  {catLabel(category)}
                </Link>
              ))}
            </div>
            <h2 className="mt-5 text-sm font-semibold text-foreground">Open to collaborate on</h2>
            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
              {person.lookingFor.length ? (
                person.lookingFor.map((item) => (
                  <li key={item} className="flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-gold" />
                    {item}
                  </li>
                ))
              ) : (
                <li>Open to new connections.</li>
              )}
            </ul>
            {person.links.length > 0 && (
              <div className="mt-5 flex flex-wrap gap-2">
                {person.links.map((link) => (
                  <a
                    key={link.label}
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-azure hover:underline"
                  >
                    {link.label}
                    <ExternalLink className="size-3.5" />
                  </a>
                ))}
              </div>
            )}
          </div>
        </aside>
        <section className="min-w-0">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-bold text-foreground">Innovations</h2>
            <Link
              to="/innovators"
              className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              {t("nav.innovators")}
            </Link>
          </div>
          {projects.length === 0 ? (
            <p className="rounded-2xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              No published innovations yet.
            </p>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2">
              {projects.map((innovation) => (
                <InnovationCard key={innovation.slug} item={innovation} />
              ))}
            </div>
          )}
        </section>
      </div>

      <CollaborationDialog
        open={collaborate}
        onClose={() => setCollaborate(false)}
        recipient={{ slug: person.slug, name: person.name }}
      />
    </>
  );
}
