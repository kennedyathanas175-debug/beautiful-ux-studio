import { Link } from "@tanstack/react-router";
import mark from "@/assets/tie-logo-mark.png.asset.json";
import full from "@/assets/tie-logo-full.png.asset.json";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <Link to="/" aria-label="TIE – Tanzania Innovation Ecosystem, home" className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <span className="grid shrink-0 place-items-center rounded-lg bg-logo-plate dark:px-1.5 dark:py-1">
        <img src={mark.url} alt="TIE" width={72} height={38} className="h-8 w-auto sm:h-9" />
      </span>
      <span className="hidden min-w-0 flex-col leading-none sm:flex">
        <span className="font-display text-[0.7rem] font-bold uppercase tracking-[0.14em] text-foreground">Tanzania Innovation</span>
        <span className="mt-1 text-[0.62rem] font-semibold uppercase tracking-[0.32em] text-muted-foreground">Ecosystem</span>
      </span>
    </Link>
  );
}

export function LogoFull({ className }: { className?: string }) {
  return (
    <span className={cn("inline-grid place-items-center rounded-2xl bg-logo-plate px-4 py-3", className)}>
      <img src={full.url} alt="TIE – Tanzania Innovation Ecosystem" width={700} height={477} loading="lazy" className="h-24 w-auto" />
    </span>
  );
}
