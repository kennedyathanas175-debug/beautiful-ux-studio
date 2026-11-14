import { Link } from "@tanstack/react-router";
import { Menu, Moon, Sun, Mail, MapPin, LogIn, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { usePrefs } from "@/lib/prefs";
import type { TKey } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import mark from "@/assets/tie-logo-mark.png.asset.json";
import { TanzaniaFlag } from "./Flag";

const links: {
  to: "/" | "/explore" | "/innovators" | "/institutions" | "/opportunities" | "/about";
  key: TKey;
}[] = [
  { to: "/", key: "nav.home" },
  { to: "/explore", key: "nav.explore" },
  { to: "/innovators", key: "nav.innovators" },
  { to: "/institutions", key: "nav.institutions" },
  { to: "/opportunities", key: "nav.opportunities" },
  { to: "/about", key: "nav.about" },
];

function LangSwitch({ className, tone = "navy" }: { className?: string; tone?: "navy" | "light" }) {
  const { lang, setLang, t } = usePrefs();
  return (
    <div
      role="group"
      aria-label={t("nav.language")}
      className={cn("inline-flex items-center gap-0.5", className)}
    >
      {(["en", "sw"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => setLang(l)}
          aria-pressed={lang === l}
          className={cn(
            "h-7 rounded px-2 text-[0.7rem] font-bold uppercase tracking-wider transition-colors",
            tone === "navy"
              ? lang === l
                ? "bg-gold text-gold-foreground"
                : "text-navy-foreground/75 hover:text-navy-foreground"
              : lang === l
                ? "bg-primary text-primary-foreground"
                : "border bg-card text-muted-foreground hover:text-foreground",
          )}
        >
          {l === "en" ? "English" : "Kiswahili"}
        </button>
      ))}
    </div>
  );
}

function Today() {
  const { lang } = usePrefs();
  const [text, setText] = useState("");
  useEffect(() => {
    setText(
      new Date().toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-GB", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      }),
    );
  }, [lang]);
  return <span suppressHydrationWarning>{text}</span>;
}

export function SiteHeader() {
  const { t, theme, toggleTheme } = usePrefs();

  return (
    <>
      <header className="relative z-40">
        {/* Utility bar */}
        <div className="bg-navy text-navy-foreground">
          <div className="container-tie flex h-9 items-center justify-between gap-4 text-[0.72rem]">
            <div className="flex min-w-0 items-center gap-4 text-navy-foreground/80">
              <span className="hidden truncate sm:inline">
                <Today />
              </span>
              <span className="hidden items-center gap-1.5 md:inline-flex">
                <Mail className="size-3.5" /> hello@tie.or.tz
              </span>
              <span className="hidden items-center gap-1.5 lg:inline-flex">
                <MapPin className="size-3.5" /> Dar es Salaam, Tanzania
              </span>
              <span className="truncate sm:hidden">{t("util.welcome")}</span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <LangSwitch />
              <button
                type="button"
                onClick={toggleTheme}
                aria-label={t("nav.theme")}
                className="grid size-7 place-items-center rounded text-navy-foreground/80 hover:bg-navy-foreground/10 hover:text-navy-foreground"
              >
                {theme === "dark" ? <Sun className="size-3.5" /> : <Moon className="size-3.5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Masthead */}
        <div className="border-b bg-card">
          <div className="container-tie grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 py-3 sm:gap-6 sm:py-4">
            <Link
              to="/"
              aria-label="TIE – home"
              className="grid shrink-0 place-items-center rounded-md bg-logo-plate dark:p-1"
            >
              <img
                src={mark.url}
                alt="TIE logo"
                width={400}
                height={209}
                className="h-10 w-auto sm:h-14"
              />
            </Link>
            <Link to="/" className="min-w-0 text-left sm:text-center">
              <p className="truncate text-[0.6rem] font-bold uppercase tracking-[0.22em] text-muted-foreground sm:text-[0.7rem]">
                {t("mast.top")}
              </p>
              <p className="truncate font-display text-base font-extrabold uppercase tracking-wide text-navy dark:text-gold sm:text-2xl">
                {t("mast.title")}
              </p>
              <p className="hidden truncate text-xs italic text-muted-foreground sm:block">
                {t("mast.sub")}
              </p>
            </Link>
            <div className="flex items-center gap-2">
              <TanzaniaFlag className="hidden h-12 w-auto sm:block sm:h-14" />
              <Sheet>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    className="lg:hidden"
                    aria-label={t("nav.menu")}
                  >
                    <Menu />
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="flex w-[86%] flex-col gap-0 p-0 sm:max-w-sm">
                  <SheetTitle className="sr-only">{t("nav.menu")}</SheetTitle>
                  <div className="flex items-center gap-3 border-b bg-navy px-5 py-4 text-navy-foreground">
                    <TanzaniaFlag className="h-7 w-auto" />
                    <span className="font-display text-sm font-bold uppercase tracking-wide">
                      {t("mast.title")}
                    </span>
                  </div>
                  <div className="h-1 flag-stripe" aria-hidden />
                  <nav aria-label="Mobile" className="flex flex-col p-2">
                    {links.map((l) => (
                      <SheetClose asChild key={l.to}>
                        <Link
                          to={l.to}
                          activeOptions={{ exact: l.to === "/" }}
                          className="border-l-4 border-transparent px-4 py-3.5 text-[0.95rem] font-semibold text-foreground transition-colors hover:bg-secondary data-[status=active]:border-gold data-[status=active]:bg-secondary"
                        >
                          {t(l.key)}
                        </Link>
                      </SheetClose>
                    ))}
                  </nav>
                  <div className="mt-auto space-y-3 border-t p-5">
                    <LangSwitch tone="light" className="w-full justify-center gap-2" />
                    <div className="grid grid-cols-2 gap-2">
                      <SheetClose asChild>
                        <Button asChild variant="outline">
                          <Link to="/auth" search={{ mode: "login" }}>
                            {t("nav.login")}
                          </Link>
                        </Button>
                      </SheetClose>
                      <SheetClose asChild>
                        <Button asChild>
                          <Link to="/auth" search={{ mode: "join" }}>
                            {t("nav.join")}
                          </Link>
                        </Button>
                      </SheetClose>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>
      </header>
      {/* Main navigation bar */}
      <div className="sticky top-0 z-40">
        <div className="hidden bg-primary text-primary-foreground shadow-card lg:block dark:bg-navy dark:text-navy-foreground">
          <div className="container-tie flex h-12 items-stretch justify-between">
            <nav aria-label="Main" className="flex items-stretch">
              {links.map((l) => (
                <Link
                  key={l.to}
                  to={l.to}
                  activeOptions={{ exact: l.to === "/" }}
                  className="flex items-center border-b-[3px] border-transparent px-4 text-[0.82rem] font-semibold uppercase tracking-wide opacity-90 transition-colors hover:bg-navy-foreground/10 hover:opacity-100 data-[status=active]:border-gold data-[status=active]:bg-navy-foreground/10 data-[status=active]:opacity-100"
                >
                  {t(l.key)}
                </Link>
              ))}
            </nav>
            <div className="flex items-center gap-2">
              <Link
                to="/auth"
                search={{ mode: "login" }}
                className="inline-flex items-center gap-1.5 px-3 text-[0.8rem] font-semibold opacity-90 hover:opacity-100"
              >
                <LogIn className="size-4" /> {t("nav.login")}
              </Link>
              <Button asChild variant="gold" size="sm" className="rounded">
                <Link to="/auth" search={{ mode: "join" }}>
                  <UserPlus /> {t("nav.join")}
                </Link>
              </Button>
            </div>
          </div>
        </div>
        <div className="h-1 flag-stripe" aria-hidden />
      </div>
    </>
  );
}
