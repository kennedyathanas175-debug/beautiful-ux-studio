import { useEffect, useState, type FormEvent } from "react";
import { Bookmark, CalendarClock, CheckCircle2, Loader2, MapPin, Send, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ApplicationStatus, Opportunity } from "@/lib/api-types";
import { api, errorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { usePrefs } from "@/lib/prefs";
import { cn } from "@/lib/utils";
import { CategoryIcon, useCategoryLabel } from "./bits";

const statusLabels: Record<ApplicationStatus, string> = {
  submitted: "Application submitted",
  under_review: "Under review",
  accepted: "Accepted",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

export function OpportunityDialog({
  opp,
  onClose,
}: {
  opp: Opportunity | null;
  onClose: () => void;
}) {
  const { t, lang } = usePrefs();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const catLabel = useCategoryLabel();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showApply, setShowApply] = useState(false);
  const [motivation, setMotivation] = useState("");
  const [applicationStatus, setApplicationStatus] = useState<ApplicationStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setSaved(opp?.viewer.saved ?? false);
    setApplicationStatus(opp?.viewer.applicationStatus ?? null);
    setShowApply(false);
    setMotivation("");
    setError("");
  }, [opp]);

  if (!opp) return null;
  const days = opp.daysLeft;

  const requireLogin = () => {
    toast.info(lang === "sw" ? "Ingia ili kuomba fursa hii" : "Log in to save or apply");
    onClose();
    void navigate({ to: "/auth", search: { mode: "login" } });
  };

  const toggleSave = async () => {
    if (!user) return requireLogin();
    setBusy(true);
    const next = !saved;
    setSaved(next);
    try {
      await api.post(`/opportunities/${opp.slug}/bookmark/`);
      toast.success(next ? "Opportunity saved" : "Removed from saved");
      void queryClient.invalidateQueries({ queryKey: ["bookmarks"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setSaved(!next);
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const apply = async (event: FormEvent) => {
    event.preventDefault();
    if (!user) return requireLogin();
    if (motivation.trim().length < 20) {
      setError("Please write at least 20 characters about your team and idea.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api.post<{ status: ApplicationStatus }>(
        `/opportunities/${opp.slug}/apply/`,
        { motivation: motivation.trim() },
      );
      setApplicationStatus(result.status);
      setShowApply(false);
      toast.success(lang === "sw" ? "Maombi yamewasilishwa" : "Application submitted");
      void queryClient.invalidateQueries({ queryKey: ["applications"] });
      void queryClient.invalidateQueries({ queryKey: ["opportunities"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-left">
          <Badge variant="outline" className="w-fit">
            {opp.type}
          </Badge>
          <DialogTitle className="pt-2 font-display text-xl leading-snug">{opp.title}</DialogTitle>
          <DialogDescription>{opp.organizer}</DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{opp.summary}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-secondary p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="size-3.5" />
              {t("common.deadline")}
            </dt>
            <dd className="mt-1 font-semibold text-foreground">
              {new Date(`${opp.deadline}T12:00:00`).toLocaleDateString(
                lang === "sw" ? "sw-TZ" : "en-GB",
                {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                },
              )}
            </dd>
            <dd className="text-xs text-muted-foreground">
              {days < 0 ? t("common.closed") : `${days} ${t("common.daysLeft")}`}
            </dd>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5" />
              Location
            </dt>
            <dd className="mt-1 font-semibold text-foreground">{opp.location}</dd>
          </div>
          <div className="col-span-2 rounded-xl bg-accent p-3">
            <dt className="flex items-center gap-1.5 text-xs text-accent-foreground">
              <Trophy className="size-3.5" />
              Reward
            </dt>
            <dd className="mt-1 font-semibold text-accent-foreground">{opp.reward}</dd>
          </div>
        </dl>
        <div>
          <p className="text-sm font-semibold text-foreground">Eligibility</p>
          <ul className="mt-2 space-y-2">
            {opp.eligibility.map((entry) => (
              <li key={entry} className="flex gap-2 text-sm text-muted-foreground">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                {entry}
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {opp.categories.map((category) => (
            <span
              key={category}
              className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground"
            >
              <CategoryIcon id={category} className="size-3.5" />
              {catLabel(category)}
            </span>
          ))}
        </div>

        {error && (
          <p
            role="alert"
            className="rounded-lg border-l-4 border-destructive bg-destructive/5 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        )}

        {showApply && !applicationStatus && (
          <form onSubmit={apply} className="space-y-3 rounded-xl border bg-surface p-4">
            <label htmlFor="motivation" className="text-sm font-semibold text-foreground">
              Why is your team a good fit?
            </label>
            <Textarea
              id="motivation"
              value={motivation}
              onChange={(event) => setMotivation(event.target.value)}
              rows={5}
              maxLength={4000}
              placeholder="Describe your team, the work you have done and what you would do with this opportunity…"
            />
            <div className="flex flex-wrap gap-2">
              <Button type="submit" disabled={busy}>
                {busy ? <Loader2 className="animate-spin" /> : <Send />} Submit application
              </Button>
              <Button type="button" variant="ghost" onClick={() => setShowApply(false)}>
                Cancel
              </Button>
            </div>
          </form>
        )}

        <div className="flex flex-wrap gap-2">
          {applicationStatus ? (
            <Badge variant="success" className="h-10 px-4 text-sm">
              <CheckCircle2 className="size-4" /> {statusLabels[applicationStatus]}
            </Badge>
          ) : (
            <Button
              variant={opp.isOpen ? "default" : "outline"}
              size="lg"
              disabled={!opp.isOpen || busy}
              onClick={() => (user ? setShowApply(true) : requireLogin())}
            >
              <Send /> {opp.isOpen ? "Apply now" : "Applications closed"}
            </Button>
          )}
          <Button
            variant={saved ? "outline" : "secondary"}
            size="lg"
            onClick={toggleSave}
            disabled={busy}
            className={cn(saved && "border-gold text-gold")}
          >
            <Bookmark className={saved ? "fill-current" : ""} />
            {saved ? t("common.saved") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
