import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Target,
  Lightbulb,
  AlertTriangle,
  Wrench,
  Handshake,
  MapPin,
  Eye,
  MessageCircle,
  Share2,
  BadgeCheck,
  ExternalLink,
  CalendarDays,
  Flag,
  Pencil,
  Clock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { Innovation } from "@/lib/api-types";
import { usePrefs } from "@/lib/prefs";
import { Avatar, CategoryIcon, StageBadge, useCategoryLabel } from "@/components/site/bits";
import { InnovationCard, LikeSaveActions } from "@/components/site/cards";
import { CommentSection } from "@/components/site/CommentSection";
import { CollaborationDialog } from "@/components/site/CollaborationDialog";
import { ReportDialog } from "@/components/site/ReportDialog";
import { MediaGallery } from "@/components/site/MediaGallery";
import { InnovationVideoSection } from "@/components/site/InnovationVideoSection";
import { ErrorState, PageLoader } from "@/components/site/states";
import { useAuth } from "@/lib/auth";
import { fetchInnovationForLoader, useInnovation, useInnovationsList } from "@/lib/queries";

export const Route = createFileRoute("/innovations/$slug")({
  loader: async ({ params }) => {
    try {
      const item = await fetchInnovationForLoader(params.slug);
      return { item, loadError: false };
    } catch (error) {
      if ((error as { status?: number }).status === 404) throw notFound();
      return { item: null, loadError: true };
    }
  },
  head: ({ loaderData }) => {
    const item = loaderData?.item;
    if (!item)
      return {
        meta: [{ title: "Innovation not found – TIE" }, { name: "robots", content: "noindex" }],
      };
    return {
      meta: [
        { title: `${item.title} – ${item.tagline} | TIE` },
        { name: "description", content: item.description },
        { property: "og:title", content: `${item.title} – TIE Tanzania Innovation Ecosystem` },
        { property: "og:description", content: item.tagline },
        { property: "og:type", content: "article" },
        { property: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => (
    <div className="container-tie py-24 text-center">
      <h1 className="text-2xl font-bold text-foreground">Innovation not found</h1>
      <p className="mt-2 text-muted-foreground">It may have been moved or unpublished.</p>
      <Button asChild className="mt-6">
        <Link to="/explore">Explore innovations</Link>
      </Button>
    </div>
  ),
  errorComponent: () => (
    <ErrorState
      title="This innovation could not be loaded"
      message="Please try again in a moment."
    />
  ),
  component: InnovationPage,
});

function InnovationPage() {
  const { slug } = Route.useParams();
  const { item: initial, loadError } = Route.useLoaderData();
  const { t, lang } = usePrefs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const catLabel = useCategoryLabel();
  const query = useInnovation(slug, initial ?? undefined);
  const item = query.data;
  const relatedQuery = useInnovationsList(
    { category: item?.category, page_size: 6 },
    Boolean(item),
  );
  const [collaborate, setCollaborate] = useState(false);
  const [reporting, setReporting] = useState(false);

  if (!item) {
    if (query.isLoading || (!loadError && query.isFetching))
      return <PageLoader label="Loading innovation…" />;
    return (
      <ErrorState
        title="This innovation is unavailable"
        message={
          loadError ? "The TIE API did not respond." : "It may have been removed or unpublished."
        }
        onRetry={() => void query.refetch()}
      />
    );
  }

  const published = new Date(item.publishedAt).toLocaleDateString(
    lang === "sw" ? "sw-TZ" : "en-GB",
    { day: "numeric", month: "short", year: "numeric" },
  );
  const related = (relatedQuery.data?.results ?? [])
    .filter((entry) => entry.slug !== item.slug)
    .slice(0, 3);
  const collaborationStatus = item.viewer.collaborationStatus;
  const isOwner = item.viewer.isOwner;
  const media = item.media ?? [];
  const galleryImages = media.filter((entry) => entry.kind === "image");
  const videos = media.filter((entry) => entry.kind === "video");
  const heroImage = item.image ?? galleryImages[0]?.thumbnailUrl ?? null;

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

  const startCollaboration = () => {
    if (!user) {
      toast.info("Log in to request collaboration");
      void navigate({ to: "/auth", search: { mode: "login" } });
      return;
    }
    setCollaborate(true);
  };

  const refetchViewer = () => {
    void queryClient.invalidateQueries({ queryKey: ["innovation", slug] });
  };

  return (
    <article>
      <div className="relative">
        <div className="relative h-[42vh] min-h-[280px] overflow-hidden bg-navy sm:h-[52vh]">
          {heroImage ? (
            <img
              src={heroImage}
              alt={item.title}
              width={1200}
              height={800}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center bg-navy-gradient">
              <CategoryIcon id={item.category} className="size-20 text-gold/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
        </div>
        <div className="container-tie relative -mt-44 pb-2 text-navy-foreground sm:-mt-52">
          <Link
            to="/explore"
            className="inline-flex items-center gap-1.5 rounded-full bg-navy/50 px-3 py-1.5 text-xs font-semibold backdrop-blur hover:bg-navy/70"
          >
            <ArrowLeft className="size-3.5" /> {t("nav.explore")}
          </Link>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Badge variant="glass">
              <CategoryIcon id={item.category} className="size-3" /> {catLabel(item.category)}
            </Badge>
            <StageBadge stage={item.stage} />
            {item.status !== "published" && <Badge variant="warning">{item.status}</Badge>}
          </div>
          <h1 className="mt-3 text-3xl font-extrabold sm:text-5xl">{item.title}</h1>
          <p className="mt-2 max-w-2xl text-base text-navy-foreground/80 sm:text-lg">
            {item.tagline}
          </p>
        </div>
      </div>

      <div className="container-tie grid gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_360px] lg:py-14">
        <div className="min-w-0 space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border bg-card p-3 shadow-card">
            <div className="flex flex-wrap items-center gap-4 px-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Eye className="size-4" />
                {item.views.toLocaleString("en")}
              </span>
              <span className="inline-flex items-center gap-1">
                <MessageCircle className="size-4" />
                {item.comments}
              </span>
              <span className="inline-flex items-center gap-1">
                <MapPin className="size-4" />
                {item.region}
              </span>
              <span className="inline-flex items-center gap-1">
                <CalendarDays className="size-4" />
                {published}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <LikeSaveActions id={item.slug} likes={item.likes} viewer={item.viewer} />
              <Button variant="ghost" size="icon-sm" onClick={share} aria-label="Share">
                <Share2 />
              </Button>
              {user && !isOwner && (
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setReporting(true)}
                  aria-label="Report"
                >
                  <Flag />
                </Button>
              )}
            </div>
          </div>

          <section>
            <h2 className="text-xl font-bold text-foreground">Overview</h2>
            <p className="mt-3 text-[0.98rem] leading-relaxed text-muted-foreground">
              {item.description}
            </p>
          </section>

          {videos.length > 0 && <InnovationVideoSection videos={videos} />}

          {galleryImages.length > 0 && <MediaGallery images={galleryImages} title={item.title} />}

          <div className="grid gap-4 md:grid-cols-2">
            <InfoBlock
              icon={AlertTriangle}
              tone="warning"
              title="The problem"
              body={item.problem}
            />
            <InfoBlock icon={Lightbulb} tone="success" title="Our solution" body={item.solution} />
          </div>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Target className="size-5 text-gold" /> Objectives
            </h2>
            <ol className="mt-4 space-y-3">
              {item.objectives.map((objective, index) => (
                <li key={objective} className="flex gap-4 rounded-xl border bg-card p-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-navy font-display text-xs font-bold text-navy-foreground">
                    {index + 1}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">{objective}</span>
                </li>
              ))}
            </ol>
          </section>

          <section>
            <h2 className="flex items-center gap-2 text-xl font-bold text-foreground">
              <Wrench className="size-5 text-gold" /> Technology & tools
            </h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {item.tech.map((tech) => (
                <Link
                  key={tech}
                  to="/explore"
                  search={{ q: tech }}
                  className="rounded-lg border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:border-gold"
                >
                  {tech}
                </Link>
              ))}
            </div>
          </section>

          <CommentSection slug={item.slug} count={item.comments} />
        </div>

        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Created by
            </p>
            <Link
              to="/innovators/$slug"
              params={{ slug: item.creator.slug }}
              className="group mt-3 flex items-center gap-3"
            >
              <Avatar
                name={item.creator.name}
                photo={item.creator.photo ?? undefined}
                className="size-12 shrink-0 rounded-xl"
              />
              <div className="min-w-0">
                <p className="truncate font-semibold text-foreground group-hover:text-azure">
                  {item.creator.name}
                </p>
                <p className="truncate text-xs text-muted-foreground">{item.creator.headline}</p>
              </div>
            </Link>
            <p className="mt-4 rounded-lg bg-secondary px-3 py-2 text-xs text-muted-foreground">
              Ownership of this innovation remains with its creator.
            </p>
            {isOwner ? (
              <Button asChild variant="outline" size="lg" className="mt-4 w-full">
                <Link to="/dashboard/innovations/$slug/edit" params={{ slug: item.slug }}>
                  <Pencil /> Edit your innovation
                </Link>
              </Button>
            ) : collaborationStatus === "pending" ? (
              <Button variant="outline" size="lg" className="mt-4 w-full" disabled>
                <Clock /> Request pending
              </Button>
            ) : collaborationStatus === "accepted" ? (
              <Button
                variant="outline"
                size="lg"
                className="mt-4 w-full border-success text-success"
                disabled
              >
                <BadgeCheck /> Collaboration accepted
              </Button>
            ) : (
              <Button variant="gold" size="lg" className="mt-4 w-full" onClick={startCollaboration}>
                <Handshake /> Request collaboration
              </Button>
            )}
            {item.link && (
              <Button asChild variant="outline" className="mt-2 w-full">
                <a href={item.link} target="_blank" rel="noreferrer">
                  <ExternalLink /> Project link
                </a>
              </Button>
            )}
          </div>

          {item.team.length > 1 && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Team
              </p>
              <ul className="mt-3 space-y-3">
                {item.team.map((member) => (
                  <li key={member.slug}>
                    <Link
                      to="/innovators/$slug"
                      params={{ slug: member.slug }}
                      className="flex items-center gap-3 hover:text-azure"
                    >
                      <Avatar
                        name={member.name}
                        photo={member.photo ?? undefined}
                        className="size-9 shrink-0 rounded-full text-xs"
                      />
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">
                          {member.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {member.headline}
                        </span>
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {item.institution && (
            <div className="rounded-2xl border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Institution
              </p>
              <p className="mt-2 flex items-start gap-1.5 font-semibold text-foreground">
                {item.institution.name}{" "}
                {item.institution.verified && (
                  <BadgeCheck className="mt-0.5 size-4 shrink-0 text-azure" />
                )}
              </p>
              <p className="text-xs text-muted-foreground">{item.institution.location}</p>
              <Link
                to="/explore"
                search={{ institution: item.institution.slug }}
                className="mt-3 inline-block text-sm font-semibold text-azure hover:underline"
              >
                More from {item.institution.short} →
              </Link>
            </div>
          )}
        </aside>
      </div>

      {related.length > 0 && (
        <section className="border-t bg-card py-14">
          <div className="container-tie">
            <h2 className="text-2xl font-bold text-foreground">Related innovations</h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((entry) => (
                <InnovationCard key={entry.slug} item={entry} />
              ))}
            </div>
          </div>
        </section>
      )}

      <CollaborationDialog
        open={collaborate}
        onClose={() => {
          setCollaborate(false);
          refetchViewer();
        }}
        innovation={{ slug: item.slug, title: item.title }}
      />
      <ReportDialog open={reporting} onClose={() => setReporting(false)} innovation={item.slug} />
    </article>
  );
}

function InfoBlock({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof Target;
  title: string;
  body: string;
  tone: "warning" | "success";
}) {
  return (
    <div className="rounded-2xl border bg-card p-5">
      <span
        className={
          tone === "warning"
            ? "grid size-10 place-items-center rounded-xl bg-warning-soft text-warning"
            : "grid size-10 place-items-center rounded-xl bg-success-soft text-success"
        }
      >
        <Icon className="size-5" />
      </span>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
    </div>
  );
}
