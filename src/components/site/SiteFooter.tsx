import { Link } from "@tanstack/react-router";
import { usePrefs } from "@/lib/prefs";
import { LogoFull } from "./Logo";

function Social({ label, href, d }: { label: string; href: string; d: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="grid size-9 place-items-center rounded-lg border border-navy-foreground/15 text-navy-foreground/70 transition-colors hover:border-gold hover:text-gold"
    >
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden>
        <path d={d} />
      </svg>
    </a>
  );
}

export function SiteFooter() {
  const { t } = usePrefs();
  const year = new Date().getFullYear();
  return (
    <footer className="relative mt-auto overflow-hidden bg-navy-gradient text-navy-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="container-tie relative grid gap-10 py-14 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div>
          <LogoFull className="bg-navy-foreground" />
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-navy-foreground/70">
            {t("footer.tagline")}
          </p>
          <div className="mt-5 flex gap-2">
            <Social
              label="X"
              href="https://x.com"
              d="M18.9 2H22l-6.8 7.8L23 22h-6.2l-4.8-6.3L6.4 22H3.3l7.3-8.3L1 2h6.3l4.4 5.8L18.9 2Zm-1.1 18h1.7L6.3 3.9H4.5L17.8 20Z"
            />
            <Social
              label="LinkedIn"
              href="https://linkedin.com"
              d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.75h4V21H3V9.75Zm7 0h3.8v1.6h.05c.53-1 1.84-2.05 3.78-2.05 4.04 0 4.79 2.66 4.79 6.12V21h-4v-4.9c0-1.17-.02-2.68-1.63-2.68-1.64 0-1.89 1.28-1.89 2.6V21h-4V9.75Z"
            />
            <Social
              label="Instagram"
              href="https://instagram.com"
              d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM12 2.2c-2.7 0-3 0-4 .06-3.6.16-5.6 2.1-5.7 5.7C2.2 9 2.2 9.3 2.2 12s0 3 .06 4c.16 3.6 2.1 5.6 5.7 5.7 1 .05 1.3.06 4 .06s3 0 4-.06c3.6-.16 5.6-2.1 5.7-5.7.05-1 .06-1.3.06-4s0-3-.06-4c-.16-3.6-2.1-5.6-5.7-5.7C15 2.2 14.7 2.2 12 2.2Z"
            />
            <Social
              label="YouTube"
              href="https://youtube.com"
              d="M23 7.2a3 3 0 0 0-2.1-2.1C19 4.6 12 4.6 12 4.6s-7 0-8.9.5A3 3 0 0 0 1 7.2 31 31 0 0 0 .5 12a31 31 0 0 0 .5 4.8 3 3 0 0 0 2.1 2.1c1.9.5 8.9.5 8.9.5s7 0 8.9-.5a3 3 0 0 0 2.1-2.1 31 31 0 0 0 .5-4.8 31 31 0 0 0-.5-4.8ZM9.7 15.1V8.9l5.8 3.1-5.8 3.1Z"
            />
          </div>
        </div>
        <FooterCol
          title={t("footer.platform")}
          links={[
            { to: "/explore", label: t("nav.explore") },
            { to: "/innovators", label: t("nav.innovators") },
            { to: "/institutions", label: t("nav.institutions") },
            { to: "/opportunities", label: t("nav.opportunities") },
          ]}
        />
        <FooterCol
          title={t("footer.community")}
          links={[
            { to: "/about", label: t("nav.about") },
            { to: "/auth", label: t("nav.join") },
          ]}
        />
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">
            {t("footer.resources")}
          </p>
          <ul className="mt-4 space-y-2.5 text-sm text-navy-foreground/75">
            <li>
              <a href="mailto:hello@tie.or.tz" className="hover:text-navy-foreground">
                hello@tie.or.tz
              </a>
            </li>
            <li>Dar es Salaam, Tanzania</li>
          </ul>
        </div>
      </div>
      <div className="relative border-t border-navy-foreground/10">
        <div className="container-tie flex flex-col gap-2 py-5 text-xs text-navy-foreground/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {t("footer.rights")}
          </p>
          <p>{t("footer.made")}</p>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: {
    to: "/explore" | "/innovators" | "/institutions" | "/opportunities" | "/about" | "/auth";
    label: string;
  }[];
}) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-[0.16em] text-gold">{title}</p>
      <ul className="mt-4 space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link
              to={l.to}
              className="text-navy-foreground/75 transition-colors hover:text-navy-foreground"
            >
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
