import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  Heart,
  MessageCircle,
  MapPin,
  BadgeCheck,
  CalendarClock,
  ArrowUpRight,
  Building2,
} from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import type { Innovation, Innovator, Institution, Opportunity } from "@/lib/api-types";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, CategoryIcon, StageBadge, useCategoryLabel } from "./bits";

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function LikeSaveActions({
  id,
  likes,
  viewer,
  compact,
}: {
  id: string;
  likes: number;
  viewer: { liked: boolean; saved: boolean };
  compact?: boolean;
}) {
  const { user } = useAuth();
  const { t, lang } = usePrefs();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [liked, setLiked] = useState(viewer.liked);
  const [saved, setSaved] = useState(viewer.saved);
  const [count, setCount] = useState(likes);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setLiked(viewer.liked);
    setSaved(viewer.saved);
  }, [viewer.liked, viewer.saved]);
  useEffect(() => {
    setCount(likes);
  }, [likes]);

  const requireLogin = () => {
    toast.info(lang === "sw" ? "Ingia ili kuhifadhi na kupenda" : "Log in to like and save");
    void navigate({ to: "/auth", search: { mode: "login" } });
  };

  const toggleLike = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return requireLogin();
    if (busy) return;
    setBusy(true);
    const next = !liked;
    setLiked(next);
    setCount((value) => Math.max(0, value + (next ? 1 : -1)));
    try {
      const result = await api.post<{ liked: boolean; likes: number }>(`/innovations/${id}/like/`);
      setLiked(result.liked);
      setCount(result.likes);
      void queryClient.invalidateQueries({ queryKey: ["innovation", id] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      setLiked(!next);
      setCount((value) => Math.max(0, value + (next ? -1 : 1)));
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const toggleSave = async (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (!user) return requireLogin();
    if (busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      await api.post(`/innovations/${id}/bookmark/`);
      toast.success(
        next
          ? lang === "sw"
            ? "Imehifadhiwa"
            : "Saved to your profile"
          : lang === "sw"
            ? "Imeondolewa"
            : "Removed from saved",
      );
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (error) {
      setSaved(!next);
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={toggleLike}
        aria-pressed={liked}
        aria-label={t("common.like")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors hover:bg-secondary",
          liked ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <Heart className={cn("size-4", liked && "fill-current")} />
        {fmt.format(count)}
      </button>
      <button
        type="button"
        onClick={toggleSave}
        aria-pressed={saved}
        aria-label={saved ? t("common.saved") : t("common.save")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors hover:bg-secondary",
          saved ? "text-gold" : "text-muted-foreground",
        )}
      >
        <Bookmark className={cn("size-4", saved && "fill-current")} />
        {!compact && (
          <span className="hidden sm:inline">{saved ? t("common.saved") : t("common.save")}</span>
        )}
      </button>
    </div>
  );
}

function InnovationImage({ item, className }: { item: Innovation; className?: string }) {
  const source = item.image ?? item.previewImage ?? null;
  return source ? (
    <img
      src={source}
      alt={item.title}
      width={1200}
      height={800}
      loading="lazy"
      className={className}
    />
  ) : (
    <div className={cn("grid place-items-center bg-navy-gradient text-navy-foreground", className)}>
      <CategoryIcon id={item.category} className="size-10 opacity-70" />
    </div>
  );
}

export function InnovationCard({ item, priority }: { item: Innovation; priority?: boolean }) {
  const catLabel = useCategoryLabel();
  return (
    <Link
      to="/innovations/$slug"
      params={{ slug: item.slug }}
      className="group card-interactive flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <InnovationImage
          item={item}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
        />
        <div className="absolute left-3 top-3 flex gap-1.5">
          <Badge variant="glass">
            <CategoryIcon id={item.category} className="size-3" />
            {catLabel(item.category)}
          </Badge>
        </div>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-center justify-between gap-3">
          <StageBadge stage={item.stage} />
          <span className="truncate text-xs text-muted-foreground">{item.region}</span>
        </div>
        <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors group-hover:text-azure">
          {item.title}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {item.tagline}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 mt-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Avatar
              name={item.creator.name}
              photo={item.creator.photo ?? undefined}
              className="size-8 shrink-0 rounded-full text-[0.7rem]"
            />
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[0.8rem] font-semibold text-foreground">
                {item.creator.name}
              </p>
              {item.institution && (
                <p className="truncate text-[0.7rem] text-muted-foreground">
                  {item.institution.short}
                </p>
              )}
            </div>
          </div>
          <LikeSaveActions id={item.slug} likes={item.likes} viewer={item.viewer} compact />
        </div>
      </div>
    </Link>
  );
}

export function TrendingRow({ item, rank }: { item: Innovation; rank: number }) {
  const catLabel = useCategoryLabel();
  return (
    <Link
      to="/innovations/$slug"
      params={{ slug: item.slug }}
      className="group flex items-center gap-4 rounded-2xl p-3 transition-colors hover:bg-secondary"
    >
      <span className="w-6 shrink-0 text-center font-display text-lg font-bold text-muted-foreground/60 group-hover:text-gold">
        {rank}
      </span>
      <InnovationImage item={item} className="size-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{item.title}</p>
        <p className="truncate text-sm text-muted-foreground">{item.tagline}</p>
        <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <CategoryIcon id={item.category} className="size-3.5" />
            {catLabel(item.category)}
          </span>
          <span className="inline-flex items-center gap-1">
            <MessageCircle className="size-3.5" />
            {item.comments}
          </span>
        </p>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function InnovatorCard({ person }: { person: Innovator }) {
  const { t } = usePrefs();
  return (
    <Link
      to="/innovators/$slug"
      params={{ slug: person.slug }}
      className="group card-interactive flex flex-col rounded-2xl border bg-card p-5 shadow-card"
    >
      <div className="flex items-center gap-4">
        <Avatar
          name={person.name}
          photo={person.photo ?? undefined}
          className="size-16 shrink-0 rounded-2xl text-lg"
        />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground group-hover:text-azure">
            {person.name}
          </h3>
          <p className="truncate text-sm text-muted-foreground">{person.headline}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">
              {person.location}
              {person.institution ? ` · ${person.institution.short}` : ""}
            </span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {person.skills.slice(0, 3).map((skill) => (
          <span
            key={skill}
            className="rounded-md bg-secondary px-2 py-1 text-[0.7rem] font-medium text-secondary-foreground"
          >
            {skill}
          </span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span>
          <strong className="text-foreground">{person.projectCount}</strong> {t("common.projects")}
        </span>
        <span>
          <strong className="text-foreground">{fmt.format(person.followers)}</strong>{" "}
          {t("common.followers")}
        </span>
      </div>
    </Link>
  );
}

export function InstitutionMonogram({
  inst,
  className,
}: {
  inst: Institution;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-xl border bg-surface font-display font-bold text-navy dark:text-gold",
        className,
      )}
      aria-hidden
    >
      {inst.short.slice(0, 4)}
    </span>
  );
}

export function InstitutionCard({ inst }: { inst: Institution }) {
  const { t } = usePrefs();
  return (
    <div className="card-interactive flex flex-col rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        <InstitutionMonogram inst={inst} className="size-14 text-sm" />
        <div className="min-w-0">
          <h3 className="flex items-start gap-1.5 text-base font-semibold leading-snug text-foreground">
            <span className="line-clamp-2">{inst.name}</span>
            {inst.verified && (
              <BadgeCheck
                className="mt-0.5 size-4 shrink-0 text-azure"
                aria-label={t("common.verified")}
              />
            )}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="size-3.5" /> {inst.type} · {inst.location}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">
        {inst.description}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 mt-5">
        <Link
          to="/explore"
          search={{ institution: inst.slug }}
          className="text-sm font-semibold text-azure hover:underline"
        >
          {inst.innovationCount ?? 0} {t("common.innovations")} →
        </Link>
        {inst.website && (
          <a
            href={inst.website}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            Website <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function OpportunityCard({
  opp,
  onOpen,
}: {
  opp: Opportunity;
  onOpen: (o: Opportunity) => void;
}) {
  const { t } = usePrefs();
  const days = opp.daysLeft;
  const urgent = days >= 0 && days <= 21;
  return (
    <button
      type="button"
      onClick={() => onOpen(opp)}
      className="group card-interactive flex w-full flex-col rounded-2xl border bg-card p-5 text-left shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline">{opp.type}</Badge>
        <span
          className={cn(
            "inline-flex items-center gap-1 text-xs font-semibold",
            days < 0 ? "text-muted-foreground" : urgent ? "text-warning" : "text-success",
          )}
        >
          <CalendarClock className="size-3.5" />
          {days < 0 ? t("common.closed") : `${days} ${t("common.daysLeft")}`}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold leading-snug text-foreground group-hover:text-azure">
        {opp.title}
      </h3>
      <p className="mt-1 text-xs text-muted-foreground">
        {opp.organizer} · {opp.location}
      </p>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
        {opp.summary}
      </p>
      <p className="mt-auto pt-4 text-sm font-semibold text-foreground">{opp.reward}</p>
    </button>
  );
}
