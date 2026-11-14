import { Sprout, HeartPulse, Sun, Wallet, GraduationCap, Leaf, Truck, Cpu, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { photos, type Photo } from "@/data/photos";
import { Badge } from "@/components/ui/badge";
import { categories, type CategoryId, type Stage } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";

const icons: Record<CategoryId, LucideIcon> = {
  agriculture: Sprout,
  health: HeartPulse,
  energy: Sun,
  fintech: Wallet,
  education: GraduationCap,
  environment: Leaf,
  mobility: Truck,
  ai: Cpu,
};

export function CategoryIcon({ id, className }: { id: CategoryId; className?: string }) {
  const Icon = icons[id];
  return <Icon className={className} aria-hidden />;
}

export function useCategoryLabel() {
  const { lang } = usePrefs();
  return (id: CategoryId) => {
    const c = categories.find((x) => x.id === id)!;
    return lang === "sw" ? c.sw : c.en;
  };
}

const stageVariant: Record<Stage, "secondary" | "info" | "gold" | "success"> = {
  concept: "secondary",
  prototype: "info",
  pilot: "gold",
  market: "success",
};

export function StageBadge({ stage, className }: { stage: Stage; className?: string }) {
  const { t } = usePrefs();
  return (
    <Badge variant={stageVariant[stage]} className={className}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(`stage.${stage}`)}
    </Badge>
  );
}

export function SectionHeader({
  eyebrow,
  title,
  body,
  action,
  className,
}: {
  eyebrow: string;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-8 grid gap-4 sm:mb-10 sm:flex sm:items-end sm:justify-between", className)}>
      <div className="min-w-0 max-w-2xl">
        <p className="eyebrow">{eyebrow}</p>
        <h2 className="mt-2 text-2xl font-bold text-foreground sm:text-[2rem] sm:leading-tight">{title}</h2>
        {body && <p className="mt-3 text-[0.95rem] leading-relaxed text-muted-foreground">{body}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Initials({ name, className }: { name: string; className?: string }) {
  const initials = name
    .replace(/^Dr\.\s*/, "")
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("");
  return (
    <span className={cn("grid place-items-center bg-navy font-display font-semibold text-navy-foreground", className)} aria-hidden>
      {initials}
    </span>
  );
}

export function Avatar({ name, photo, className }: { name: string; photo?: string; className?: string }) {
  return photo ? (
    <img src={photo} alt={name} loading="lazy" width={816} height={816} className={cn("object-cover object-top", className)} />
  ) : (
    <Initials name={name} className={className} />
  );
}

export function PageIntro({
  eyebrow,
  title,
  body,
  children,
  photo = photos.darDusk,
}: {
  eyebrow: string;
  title: string;
  body: string;
  children?: ReactNode;
  photo?: Photo;
}) {
  const { t } = usePrefs();
  return (
    <section className="relative overflow-hidden bg-navy text-navy-foreground">
      <img src={photo.src} alt="" className="absolute inset-0 h-full w-full object-cover" />
      <div className="absolute inset-0 bg-gradient-to-r from-navy via-navy/90 to-navy/55" />
      <div className="container-tie relative py-10 sm:py-14">
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-navy-foreground/75">
          <Link to="/" className="hover:text-navy-foreground hover:underline">{t("breadcrumb.home")}</Link>
          <ChevronRight className="size-3.5" />
          <span className="font-semibold text-gold">{eyebrow}</span>
        </nav>
        <h1 className="mt-3 max-w-3xl text-3xl font-bold sm:text-5xl sm:leading-[1.05]">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-foreground/80 sm:text-lg">{body}</p>
        {children}
      </div>
      <PhotoCredit photo={photo} />
    </section>
  );
}

export function PhotoCredit({ photo, className }: { photo: Photo; className?: string }) {
  const { t } = usePrefs();
  return (
    <a
      href={photo.source}
      target="_blank"
      rel="noreferrer"
      className={cn("absolute bottom-1.5 right-2 z-10 rounded bg-navy/60 px-1.5 py-0.5 text-[0.6rem] text-navy-foreground/75 backdrop-blur hover:text-navy-foreground", className)}
    >
      {t("photo.credit")}: {photo.place} · {photo.credit}, {photo.license}
    </a>
  );
}
