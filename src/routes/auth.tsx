import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Lightbulb, GraduationCap, FlaskConical, Palette, Building2, Mail, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { photos } from "@/data/photos";
import { usePrefs } from "@/lib/prefs";
import { PhotoCredit } from "@/components/site/bits";
import { TanzaniaFlag } from "@/components/site/Flag";

interface AuthSearch {
  mode?: "login" | "join";
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => ({
    mode: s.mode === "login" || s.mode === "join" ? s.mode : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Join or log in – TIE Tanzania Innovation Ecosystem" },
      { name: "description", content: "Create your TIE account as an innovator, student, researcher, creator or institution representative." },
      { property: "og:title", content: "Join TIE – Tanzania Innovation Ecosystem" },
      { property: "og:description", content: "Become part of Tanzania's national innovation network." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { mode } = Route.useSearch();
  const { t, lang } = usePrefs();
  const sw = lang === "sw";
  const roles = [
    { icon: Lightbulb, label: sw ? "Mbunifu" : "Innovator" },
    { icon: GraduationCap, label: sw ? "Mwanafunzi" : "Student" },
    { icon: FlaskConical, label: sw ? "Mtafiti" : "Researcher" },
    { icon: Palette, label: sw ? "Msanii / Mbunifu wa maudhui" : "Creator" },
    { icon: Building2, label: sw ? "Mwakilishi wa taasisi" : "Institution representative" },
  ];
  return (
    <section className="grid min-h-[70vh] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <img src={photos.darDusk.src} alt={photos.darDusk.place} className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/30" />
        <div className="absolute bottom-12 left-12 right-12 text-navy-foreground">
          <TanzaniaFlag className="h-10 w-auto" />
          <p className="mt-5 font-display text-3xl font-bold leading-tight">{t("hero.title.1")} {t("hero.title.2")}</p>
          <p className="mt-3 text-navy-foreground/75">{t("footer.tagline")}</p>
        </div>
        <PhotoCredit photo={photos.darDusk} />
      </div>
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <p className="eyebrow">{mode === "login" ? t("nav.login") : t("nav.join")}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {mode === "login" ? (sw ? "Karibu tena" : "Welcome back") : sw ? "Jiunge na mfumo wa ubunifu" : "Join the ecosystem"}
          </h1>
          <div className="mt-6 flex gap-3 rounded-lg border-l-4 border-gold bg-accent p-4 text-sm text-accent-foreground">
            <Clock className="mt-0.5 size-4 shrink-0" />
            <p>
              {sw
                ? "Usajili wa akaunti unaandaliwa sasa hivi. Hivi karibuni utaweza kujisajili, kuingia, kuchapisha ubunifu wako na kuomba ushirikiano."
                : "Account registration is being set up right now. Soon you'll be able to sign up, log in, publish your innovations and request collaborations."}
            </p>
          </div>
          <p className="mt-8 text-sm font-semibold text-foreground">{sw ? "Unaweza kujiunga kama:" : "You'll be able to join as:"}</p>
          <ul className="mt-3 grid gap-2">
            {roles.map((r) => (
              <li key={r.label} className="flex items-center gap-3 rounded-md border bg-card px-4 py-3 text-sm font-medium text-foreground">
                <r.icon className="size-4 text-azure" /> {r.label}
              </li>
            ))}
          </ul>
          <div className="mt-8 grid gap-2 sm:grid-cols-2">
            <Button asChild size="lg"><Link to="/explore">{t("hero.cta.explore")} <ArrowRight /></Link></Button>
            <Button asChild size="lg" variant="outline"><a href="mailto:hello@tie.or.tz?subject=Notify%20me%20when%20TIE%20accounts%20open"><Mail /> {sw ? "Nijulishe" : "Notify me"}</a></Button>
          </div>
        </div>
      </div>
    </section>
  );
}
