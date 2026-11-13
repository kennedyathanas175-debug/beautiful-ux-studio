import { Sprout, HeartPulse, Sun, Wallet, GraduationCap, Leaf, Truck, Cpu, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
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

export function PageIntro({ eyebrow, title, body, children }: { eyebrow: string; title: string; body: string; children?: ReactNode }) {
  return (
    <section className="relative overflow-hidden border-b bg-card">
      <div className="pointer-events-none absolute inset-0 bg-dots opacity-60 [mask-image:linear-gradient(to_bottom,black,transparent)]" />
      <div className="container-tie relative py-12 sm:py-16">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-bold text-foreground sm:text-5xl sm:leading-[1.05]">{title}</h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">{body}</p>
        {children}
      </div>
    </section>
  );
}
