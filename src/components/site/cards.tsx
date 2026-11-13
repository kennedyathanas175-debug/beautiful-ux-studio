import { Link } from "@tanstack/react-router";
import { Bookmark, Heart, MessageCircle, MapPin, BadgeCheck, CalendarClock, ArrowUpRight, Building2 } from "lucide-react";
import { toast } from "sonner";
import type { Innovation, Innovator, Institution, Opportunity } from "@/data/catalog";
import { getInnovator, getInstitution, innovations, daysUntil } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Avatar, CategoryIcon, StageBadge, useCategoryLabel } from "./bits";

const fmt = new Intl.NumberFormat("en", { notation: "compact" });

export function LikeSaveActions({ id, likes, compact }: { id: string; likes: number; compact?: boolean }) {
  const { liked, saved, toggleLike, toggleSave, t, lang } = usePrefs();
  const isLiked = liked.has(id);
  const isSaved = saved.has(id);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleLike(id);
        }}
        aria-pressed={isLiked}
        aria-label={t("common.like")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors hover:bg-secondary",
          isLiked ? "text-destructive" : "text-muted-foreground",
        )}
      >
        <Heart className={cn("size-4", isLiked && "fill-current")} />
        {fmt.format(likes + (isLiked ? 1 : 0))}
      </button>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const on = toggleSave(id);
          toast.success(on ? (lang === "sw" ? "Imehifadhiwa kwenye kifaa hiki" : "Saved on this device") : lang === "sw" ? "Imeondolewa" : "Removed from saved");
        }}
        aria-pressed={isSaved}
        aria-label={isSaved ? t("common.saved") : t("common.save")}
        className={cn(
          "inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-colors hover:bg-secondary",
          isSaved ? "text-gold" : "text-muted-foreground",
        )}
      >
        <Bookmark className={cn("size-4", isSaved && "fill-current")} />
        {!compact && <span className="hidden sm:inline">{isSaved ? t("common.saved") : t("common.save")}</span>}
      </button>
    </div>
  );
}

export function InnovationCard({ item, priority }: { item: Innovation; priority?: boolean }) {
  const catLabel = useCategoryLabel();
  const creator = getInnovator(item.creator);
  const inst = getInstitution(item.institution);
  return (
    <Link
      to="/innovations/$slug"
      params={{ slug: item.slug }}
      className="group card-interactive flex flex-col overflow-hidden rounded-2xl border bg-card shadow-card focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-muted">
        <img
          src={item.image}
          alt={item.title}
          width={1200}
          height={800}
          loading={priority ? "eager" : "lazy"}
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
        <h3 className="mt-3 text-lg font-semibold text-foreground transition-colors group-hover:text-azure">{item.title}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{item.tagline}</p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 mt-5">
          <div className="flex min-w-0 items-center gap-2.5">
            {creator && <Avatar name={creator.name} photo={creator.photo} className="size-8 shrink-0 rounded-full text-[0.7rem]" />}
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[0.8rem] font-semibold text-foreground">{creator?.name}</p>
              {inst && <p className="truncate text-[0.7rem] text-muted-foreground">{inst.short}</p>}
            </div>
          </div>
          <LikeSaveActions id={item.slug} likes={item.likes} compact />
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
      <span className="w-6 shrink-0 text-center font-display text-lg font-bold text-muted-foreground/60 group-hover:text-gold">{rank}</span>
      <img src={item.image} alt="" width={1200} height={800} loading="lazy" className="size-14 shrink-0 rounded-xl object-cover" />
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-foreground">{item.title}</p>
        <p className="truncate text-sm text-muted-foreground">{item.tagline}</p>
        <p className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><CategoryIcon id={item.category} className="size-3.5" />{catLabel(item.category)}</span>
          <span className="inline-flex items-center gap-1"><MessageCircle className="size-3.5" />{item.comments}</span>
        </p>
      </div>
      <ArrowUpRight className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
    </Link>
  );
}

export function InnovatorCard({ person }: { person: Innovator }) {
  const { t } = usePrefs();
  const inst = getInstitution(person.institution);
  const count = innovations.filter((i) => i.team.includes(person.slug)).length;
  return (
    <Link
      to="/innovators/$slug"
      params={{ slug: person.slug }}
      className="group card-interactive flex flex-col rounded-2xl border bg-card p-5 shadow-card"
    >
      <div className="flex items-center gap-4">
        <Avatar name={person.name} photo={person.photo} className="size-16 shrink-0 rounded-2xl text-lg" />
        <div className="min-w-0">
          <h3 className="truncate text-base font-semibold text-foreground group-hover:text-azure">{person.name}</h3>
          <p className="truncate text-sm text-muted-foreground">{person.headline}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="size-3.5 shrink-0" />
            <span className="truncate">{person.location}{inst ? ` · ${inst.short}` : ""}</span>
          </p>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {person.skills.slice(0, 3).map((s) => (
          <span key={s} className="rounded-md bg-secondary px-2 py-1 text-[0.7rem] font-medium text-secondary-foreground">{s}</span>
        ))}
      </div>
      <div className="mt-5 flex items-center justify-between border-t pt-4 text-xs text-muted-foreground">
        <span><strong className="text-foreground">{count}</strong> {t("common.projects")}</span>
        <span><strong className="text-foreground">{fmt.format(person.followers)}</strong> {t("common.followers")}</span>
      </div>
    </Link>
  );
}

export function InstitutionMonogram({ inst, className }: { inst: Institution; className?: string }) {
  return (
    <span className={cn("grid shrink-0 place-items-center rounded-xl border bg-surface font-display font-bold text-navy dark:text-gold", className)} aria-hidden>
      {inst.short.slice(0, 4)}
    </span>
  );
}

export function InstitutionCard({ inst }: { inst: Institution }) {
  const { t } = usePrefs();
  const items = innovations.filter((i) => i.institution === inst.slug).length;
  return (
    <div className="card-interactive flex flex-col rounded-2xl border bg-card p-5 shadow-card">
      <div className="flex items-start gap-4">
        <InstitutionMonogram inst={inst} className="size-14 text-sm" />
        <div className="min-w-0">
          <h3 className="flex items-start gap-1.5 text-base font-semibold leading-snug text-foreground">
            <span className="line-clamp-2">{inst.name}</span>
            {inst.verified && <BadgeCheck className="mt-0.5 size-4 shrink-0 text-azure" aria-label={t("common.verified")} />}
          </h3>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            <Building2 className="size-3.5" /> {inst.type} · {inst.location}
          </p>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{inst.description}</p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t pt-4 mt-5">
        <Link
          to="/explore"
          search={{ institution: inst.slug }}
          className="text-sm font-semibold text-azure hover:underline"
        >
          {items} {t("common.innovations")} →
        </Link>
        {inst.website && (
          <a href={inst.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
            Website <ArrowUpRight className="size-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function OpportunityCard({ opp, onOpen }: { opp: Opportunity; onOpen: (o: Opportunity) => void }) {
  const { t } = usePrefs();
  const days = daysUntil(opp.deadline);
  const urgent = days >= 0 && days <= 21;
  return (
    <button
      type="button"
      onClick={() => onOpen(opp)}
      className="group card-interactive flex w-full flex-col rounded-2xl border bg-card p-5 text-left shadow-card"
    >
      <div className="flex items-center justify-between gap-3">
        <Badge variant="outline">{opp.type}</Badge>
        <span className={cn("inline-flex items-center gap-1 text-xs font-semibold", days < 0 ? "text-muted-foreground" : urgent ? "text-warning" : "text-success")}>
          <CalendarClock className="size-3.5" />
          {days < 0 ? t("common.closed") : `${days} ${t("common.daysLeft")}`}
        </span>
      </div>
      <h3 className="mt-4 text-base font-semibold leading-snug text-foreground group-hover:text-azure">{opp.title}</h3>
      <p className="mt-1 text-xs text-muted-foreground">{opp.organizer} · {opp.location}</p>
      <p className="mt-3 line-clamp-2 text-sm leading-relaxed text-muted-foreground">{opp.summary}</p>
      <p className="mt-auto pt-4 text-sm font-semibold text-foreground">{opp.reward}</p>
    </button>
  );
}
