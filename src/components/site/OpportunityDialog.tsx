import { Bookmark, CalendarClock, CheckCircle2, MapPin, Trophy } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { daysUntil, type Opportunity } from "@/data/catalog";
import { usePrefs } from "@/lib/prefs";
import { CategoryIcon, useCategoryLabel } from "./bits";

export function OpportunityDialog({ opp, onClose }: { opp: Opportunity | null; onClose: () => void }) {
  const { t, saved, toggleSave, lang } = usePrefs();
  const catLabel = useCategoryLabel();
  if (!opp) return null;
  const days = daysUntil(opp.deadline);
  const isSaved = saved.has(`opp:${opp.id}`);
  const deadline = new Date(opp.deadline).toLocaleDateString(lang === "sw" ? "sw-TZ" : "en-GB", { day: "numeric", month: "long", year: "numeric" });
  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto rounded-2xl sm:max-w-lg">
        <DialogHeader className="text-left">
          <Badge variant="outline" className="w-fit">{opp.type}</Badge>
          <DialogTitle className="pt-2 font-display text-xl leading-snug">{opp.title}</DialogTitle>
          <DialogDescription>{opp.organizer}</DialogDescription>
        </DialogHeader>
        <p className="text-sm leading-relaxed text-muted-foreground">{opp.summary}</p>
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-secondary p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarClock className="size-3.5" />{t("common.deadline")}</dt>
            <dd className="mt-1 font-semibold text-foreground">{deadline}</dd>
            <dd className="text-xs text-muted-foreground">{days < 0 ? t("common.closed") : `${days} ${t("common.daysLeft")}`}</dd>
          </div>
          <div className="rounded-xl bg-secondary p-3">
            <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" />Location</dt>
            <dd className="mt-1 font-semibold text-foreground">{opp.location}</dd>
          </div>
          <div className="col-span-2 rounded-xl bg-accent p-3">
            <dt className="flex items-center gap-1.5 text-xs text-accent-foreground"><Trophy className="size-3.5" />Reward</dt>
            <dd className="mt-1 font-semibold text-accent-foreground">{opp.reward}</dd>
          </div>
        </dl>
        <div>
          <p className="text-sm font-semibold text-foreground">Eligibility</p>
          <ul className="mt-2 space-y-2">
            {opp.eligibility.map((e) => (
              <li key={e} className="flex gap-2 text-sm text-muted-foreground"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />{e}</li>
            ))}
          </ul>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {opp.categories.map((c) => (
            <span key={c} className="inline-flex items-center gap-1 rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground">
              <CategoryIcon id={c} className="size-3.5" />{catLabel(c)}
            </span>
          ))}
        </div>
        <Button
          variant={isSaved ? "outline" : "default"}
          size="lg"
          onClick={() => {
            const on = toggleSave(`opp:${opp.id}`);
            toast.success(on ? (lang === "sw" ? "Fursa imehifadhiwa kwenye kifaa hiki" : "Opportunity saved on this device") : lang === "sw" ? "Imeondolewa" : "Removed from saved");
          }}
        >
          <Bookmark className={isSaved ? "fill-current" : ""} />
          {isSaved ? t("common.saved") : t("common.save")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
