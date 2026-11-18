import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import {
  ArrowRight,
  Lightbulb,
  GraduationCap,
  FlaskConical,
  Palette,
  Building2,
  ShieldCheck,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { photos } from "@/data/photos";
import { communityRoles } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { useAuth } from "@/lib/auth";
import { ApiError, errorMessage } from "@/lib/api";
import { useInstitutionOptions } from "@/lib/queries";
import { PhotoCredit } from "@/components/site/bits";
import { TanzaniaFlag } from "@/components/site/Flag";
import { InlineError } from "@/components/site/states";

interface AuthSearch {
  mode?: "login" | "join" | undefined;
  redirect?: string | undefined;
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): AuthSearch => {
    const mode = s["mode"] === "login" || s["mode"] === "join" ? s["mode"] : undefined;
    const redirect =
      typeof s["redirect"] === "string" &&
      s["redirect"].startsWith("/") &&
      !s["redirect"].startsWith("//")
        ? s["redirect"]
        : undefined;
    return { mode, redirect };
  },
  head: () => ({
    meta: [
      { title: "Join or log in – TIE Tanzania Innovation Ecosystem" },
      {
        name: "description",
        content:
          "Create your TIE account as an innovator, student, researcher, creator or institution representative.",
      },
      { property: "og:title", content: "Join TIE – Tanzania Innovation Ecosystem" },
      {
        property: "og:description",
        content: "Become part of Tanzania's national innovation network.",
      },
      { property: "og:type", content: "website" },
      { property: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const roleIcons = {
  innovator: Lightbulb,
  student: GraduationCap,
  researcher: FlaskConical,
  creator: Palette,
  institution_rep: Building2,
} as const;

function AuthPage() {
  const { mode = "join", redirect } = Route.useSearch();
  const { t, lang } = usePrefs();
  const { user, login, register } = useAuth();
  const navigate = useNavigate();
  const institutions = useInstitutionOptions();
  const sw = lang === "sw";
  const isLogin = mode === "login";

  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [role, setRole] = useState<string>("innovator");
  const [institution, setInstitution] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fields, setFields] = useState<Record<string, string[]>>({});

  const afterAuth = () => {
    if (redirect && redirect.startsWith("/") && !redirect.startsWith("//")) {
      window.location.assign(redirect);
    } else {
      void navigate({ to: "/dashboard" });
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setFields({});
    setBusy(true);
    try {
      if (isLogin) {
        await login(email.trim(), password);
        toast.success(sw ? "Karibu tena" : "Welcome back");
      } else {
        await register({
          email: email.trim(),
          fullName: fullName.trim(),
          password,
          passwordConfirm,
          role,
          institution: role === "institution_rep" && institution ? institution : null,
        });
        toast.success(sw ? "Akaunti yako imefunguliwa" : "Your account is ready");
      }
      afterAuth();
    } catch (err) {
      if (err instanceof ApiError) {
        setFields(err.fields);
        setError(err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  const fieldError = (name: string) => fields[name]?.[0];

  return (
    <section className="grid min-h-[70vh] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy lg:block">
        <img
          src={photos.darDusk.src}
          alt={photos.darDusk.place}
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy via-navy/70 to-navy/30" />
        <div className="absolute bottom-12 left-12 right-12 text-navy-foreground">
          <TanzaniaFlag className="h-10 w-auto" />
          <p className="mt-5 font-display text-3xl font-bold leading-tight">
            {t("hero.title.1")} {t("hero.title.2")}
          </p>
          <p className="mt-3 text-navy-foreground/75">{t("footer.tagline")}</p>
        </div>
        <PhotoCredit photo={photos.darDusk} />
      </div>
      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-md">
          <p className="eyebrow">{isLogin ? t("nav.login") : t("nav.join")}</p>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {isLogin
              ? sw
                ? "Karibu tena"
                : "Welcome back"
              : sw
                ? "Jiunge na mfumo wa ubunifu"
                : "Join the ecosystem"}
          </h1>

          {user && (
            <div className="mt-4 rounded-lg border-l-4 border-success bg-success-soft p-4 text-sm text-foreground">
              You are signed in as <strong>{user.name}</strong>.{" "}
              <Link to="/dashboard" className="font-semibold underline">
                Go to your dashboard
              </Link>
            </div>
          )}

          <div className="mt-6 flex gap-1 rounded-lg border bg-secondary p-1">
            <Link
              to="/auth"
              search={{ mode: "login", redirect }}
              className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors ${isLogin ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("nav.login")}
            </Link>
            <Link
              to="/auth"
              search={{ mode: "join", redirect }}
              className={`flex-1 rounded-md px-3 py-2 text-center text-sm font-semibold transition-colors ${!isLogin ? "bg-card text-foreground shadow-card" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("nav.join")}
            </Link>
          </div>

          <div className="mt-5 flex gap-3 rounded-lg border-l-4 border-gold bg-accent p-4 text-sm text-accent-foreground">
            <ShieldCheck className="mt-0.5 size-4 shrink-0" />
            <p>
              {sw
                ? "Akaunti yako inakupa uwezo wa kuchapisha ubunifu, kuhifadhi fursa na kuomba ushirikiano. Taarifa zako zinalindwa."
                : "Your account lets you publish innovations, save opportunities and request collaboration. Your data is protected."}
            </p>
          </div>

          {error && (
            <div className="mt-4">
              <InlineError message={error} />
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            {!isLogin && (
              <label className="block text-sm font-semibold text-foreground">
                {sw ? "Jina kamili" : "Full name"}
                <input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  autoComplete="name"
                  required
                  className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                {fieldError("fullName") && (
                  <span className="mt-1 block text-xs text-destructive">
                    {fieldError("fullName")}
                  </span>
                )}
              </label>
            )}

            <label className="block text-sm font-semibold text-foreground">
              {sw ? "Barua pepe" : "Email address"}
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
              {fieldError("email") && (
                <span className="mt-1 block text-xs text-destructive">{fieldError("email")}</span>
              )}
            </label>

            {!isLogin && (
              <fieldset>
                <legend className="text-sm font-semibold text-foreground">
                  {sw ? "Unajiunga kama:" : "Join as:"}
                </legend>
                <div className="mt-2 grid gap-2">
                  {communityRoles.map((option) => {
                    const Icon = roleIcons[option.value];
                    const active = role === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        aria-pressed={active}
                        onClick={() => setRole(option.value)}
                        className={`flex items-center gap-3 rounded-md border px-4 py-2.5 text-left text-sm font-medium transition-colors ${active ? "border-gold bg-accent text-accent-foreground" : "bg-card text-foreground hover:border-foreground/25"}`}
                      >
                        <Icon
                          className={`size-4 ${active ? "text-azure" : "text-muted-foreground"}`}
                        />
                        {sw ? option.labelSw : option.label}
                        {active && (
                          <span className="ml-auto text-xs font-bold uppercase tracking-wide text-azure">
                            Selected
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {fieldError("role") && (
                  <span className="mt-1 block text-xs text-destructive">{fieldError("role")}</span>
                )}
              </fieldset>
            )}

            {!isLogin && role === "institution_rep" && (
              <label className="block text-sm font-semibold text-foreground">
                {sw ? "Taasisi (hiari)" : "Institution (optional)"}
                <select
                  value={institution}
                  onChange={(event) => setInstitution(event.target.value)}
                  className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground"
                >
                  <option value="">{sw ? "Chagua taasisi" : "Select an institution"}</option>
                  {(institutions.data?.results ?? []).map((item) => (
                    <option key={item.slug} value={item.slug}>
                      {item.name}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label className="block text-sm font-semibold text-foreground">
              {sw ? "Nenosiri" : "Password"}
              <span className="relative mt-1.5 block">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  minLength={8}
                  className="h-11 w-full rounded-md border bg-card px-3 pr-10 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </span>
              {!isLogin && (
                <span className="mt-1 block text-xs font-normal text-muted-foreground">
                  At least 8 characters. Avoid common or numeric-only passwords.
                </span>
              )}
              {fieldError("password") && (
                <span className="mt-1 block text-xs text-destructive">
                  {fieldError("password")}
                </span>
              )}
            </label>

            {!isLogin && (
              <label className="block text-sm font-semibold text-foreground">
                {sw ? "Rudia nenosiri" : "Confirm password"}
                <input
                  type={showPassword ? "text" : "password"}
                  value={passwordConfirm}
                  onChange={(event) => setPasswordConfirm(event.target.value)}
                  autoComplete="new-password"
                  required
                  minLength={8}
                  className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
                />
                {fieldError("passwordConfirm") && (
                  <span className="mt-1 block text-xs text-destructive">
                    {fieldError("passwordConfirm")}
                  </span>
                )}
              </label>
            )}

            {isLogin && (
              <div className="text-right">
                <Link
                  to="/reset-password"
                  className="text-sm font-medium text-azure hover:underline"
                >
                  {sw ? "Umesahau nenosiri?" : "Forgot your password?"}
                </Link>
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <ArrowRight />}
              {isLogin ? (sw ? "Ingia" : "Log in") : sw ? "Fungua akaunti" : "Create account"}
            </Button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 text-sm">
            <Link to="/explore" className="font-medium text-muted-foreground hover:text-foreground">
              {sw ? "Endelea kama mgeni" : "Continue as a guest"}
            </Link>
            <span className="text-xs text-muted-foreground">
              By joining you agree to responsible use of the platform.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
