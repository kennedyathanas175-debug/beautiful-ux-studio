import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, Languages } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { usePrefs } from "@/lib/prefs";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LogoMark } from "./Logo";

const links: { to: "/" | "/explore" | "/innovators" | "/institutions" | "/opportunities" | "/about"; key: TKey }[] = [
  { to: "/", key: "nav.home" },
  { to: "/explore", key: "nav.explore" },
  { to: "/innovators", key: "nav.innovators" },
  { to: "/institutions", key: "nav.institutions" },
  { to: "/opportunities", key: "nav.opportunities" },
  { to: "/about", key: "nav.about" },
];

function LangSwitch({ className }: { className?: string }) {
  const { lang, setLang, t } = usePrefs();
  return (
    <div role="group" aria-label={t("nav.language")} className={cn("inline-flex items-center rounded-lg border bg-card p-0.5", className)}>
      <Languages className="mx-1.5 size-3.5 text-muted-foreground" aria-hidden />
      {(["en", "sw"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "h-7 rounded-md px-2 text-[0.7rem] font-bold uppercase tracking-wider transition-colors",
            lang === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme, t } = usePrefs();
  return (
    <Button variant="ghost" size="icon-sm" onClick={toggleTheme} aria-label={t("nav.theme")}>
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}

export function SiteHeader() {
  const { t } = usePrefs();
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-40 border-b transition-all duration-300",
        scrolled ? "border-border bg-background/85 backdrop-blur-xl" : "border-transparent bg-background",
      )}
    >
      <div className="h-0.5 w-full flag-stripe opacity-90" aria-hidden />
      <div className="container-tie grid h-16 grid-cols-[minmax(0,1fr)_auto] items-center gap-4 lg:flex lg:justify-between">
        <LogoMark />

        <nav aria-label="Main" className="hidden items-center gap-0.5 lg:flex">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              activeOptions={{ exact: l.to === "/" }}
              className="relative rounded-lg px-3 py-2 text-[0.84rem] font-medium text-muted-foreground transition-colors hover:text-foreground data-[status=active]:text-foreground data-[status=active]:after:absolute data-[status=active]:after:inset-x-3 data-[status=active]:after:-bottom-[13px] data-[status=active]:after:h-0.5 data-[status=active]:after:rounded-full data-[status=active]:after:bg-gold"
            >
              {t(l.key)}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LangSwitch className="hidden md:inline-flex" />
          <ThemeToggle />
          <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
            <Link to="/auth" search={{ mode: "login" }}>{t("nav.login")}</Link>
          </Button>
          <Button asChild size="sm" className="hidden sm:inline-flex">
            <Link to="/auth" search={{ mode: "join" }}>{t("nav.join")}</Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon-sm" className="lg:hidden" aria-label={t("nav.menu")}>
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="flex w-[86%] flex-col gap-0 p-0 sm:max-w-sm">
              <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
              <div className="flex h-16 items-center border-b px-5">
                <LogoMark />
              </div>
              <nav aria-label="Mobile" className="flex flex-col p-3">
                {links.map((l) => (
                  <SheetClose asChild key={l.to}>
                    <Link
                      to={l.to}
                      activeOptions={{ exact: l.to === "/" }}
                      className="rounded-xl px-4 py-3.5 text-[0.95rem] font-medium text-foreground transition-colors hover:bg-secondary data-[status=active]:bg-secondary data-[status=active]:text-foreground"
                    >
                      {t(l.key)}
                    </Link>
                  </SheetClose>
                ))}
              </nav>
              <div className="mt-auto space-y-3 border-t p-5">
                <LangSwitch className="w-full justify-center" />
                <div className="grid grid-cols-2 gap-2">
                  <SheetClose asChild>
                    <Button asChild variant="outline"><Link to="/auth" search={{ mode: "login" }}>{t("nav.login")}</Link></Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild><Link to="/auth" search={{ mode: "join" }}>{t("nav.join")}</Link></Button>
                  </SheetClose>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
