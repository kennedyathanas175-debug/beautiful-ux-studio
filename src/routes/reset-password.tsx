import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { ArrowLeft, KeyRound, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api, ApiError, errorMessage } from "@/lib/api";
import { InlineError } from "@/components/site/states";

interface ResetSearch {
  uid?: string | undefined;
  token?: string | undefined;
}

export const Route = createFileRoute("/reset-password")({
  validateSearch: (s: Record<string, unknown>): ResetSearch => ({
    uid: typeof s["uid"] === "string" ? s["uid"] : undefined,
    token: typeof s["token"] === "string" ? s["token"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Reset your password – TIE" },
      { name: "description", content: "Reset the password for your TIE account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const { uid, token } = Route.useSearch();
  const navigate = useNavigate();
  const confirming = Boolean(uid && token);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);

  const request = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/password-reset/", { email: email.trim() });
      setSent(true);
      toast.success("If that account exists, a reset link is on its way.");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/password-reset/confirm/", {
        uid,
        token,
        password,
        passwordConfirm,
      });
      toast.success("Password updated. You can log in now.");
      void navigate({ to: "/auth", search: { mode: "login" } });
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) {
        setError(Object.values(err.fields)[0]?.[0] ?? err.message);
      } else {
        setError(errorMessage(err));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="container-tie flex min-h-[65vh] items-center justify-center py-14">
      <div className="w-full max-w-md rounded-2xl border bg-card p-6 shadow-card sm:p-8">
        <span className="grid size-12 place-items-center rounded-xl bg-navy text-navy-foreground">
          {confirming ? <KeyRound className="size-5" /> : <Mail className="size-5" />}
        </span>
        <h1 className="mt-4 text-2xl font-bold text-foreground">
          {confirming ? "Choose a new password" : "Reset your password"}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {confirming
            ? "Enter a new password for your TIE account. Password reset links expire for your security."
            : "Enter the email address associated with your TIE account and we will send a secure reset link."}
        </p>

        {error && (
          <div className="mt-4">
            <InlineError message={error} />
          </div>
        )}
        {sent && !confirming && (
          <div className="mt-4 rounded-lg border-l-4 border-success bg-success-soft p-4 text-sm text-foreground">
            Check your inbox (and spam folder) for the reset link. In local development, the link is
            printed in the Django server log.
          </div>
        )}

        {confirming ? (
          <form onSubmit={confirm} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-foreground">
              New password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <label className="block text-sm font-semibold text-foreground">
              Confirm new password
              <input
                type="password"
                value={passwordConfirm}
                onChange={(event) => setPasswordConfirm(event.target.value)}
                minLength={8}
                required
                autoComplete="new-password"
                className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <KeyRound />} Update password
            </Button>
          </form>
        ) : (
          <form onSubmit={request} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-foreground">
              Email address
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground outline-none focus:ring-2 focus:ring-ring"
              />
            </label>
            <Button type="submit" size="lg" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Mail />} Send reset link
            </Button>
          </form>
        )}

        <Link
          to="/auth"
          search={{ mode: "login" }}
          className="mt-6 inline-flex items-center gap-1 text-sm font-medium text-azure hover:underline"
        >
          <ArrowLeft className="size-4" /> Back to log in
        </Link>
      </div>
    </section>
  );
}
