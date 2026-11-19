import { useEffect, useState, type FormEvent } from "react";
import { Flag, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { api, ApiError, errorMessage } from "@/lib/api";

const reasons = [
  { value: "spam", label: "Spam or misleading" },
  { value: "abuse", label: "Harassment or abuse" },
  { value: "copyright", label: "Copyright infringement" },
  { value: "other", label: "Other" },
];

export function ReportDialog({
  open,
  onClose,
  innovation,
  commentId,
}: {
  open: boolean;
  onClose: () => void;
  innovation?: string | undefined;
  commentId?: number | undefined;
}) {
  const [reason, setReason] = useState("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      setReason("spam");
      setDetails("");
      setError("");
    }
  }, [open]);

  if (!open) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post("/reports/", {
        ...(innovation ? { innovation } : {}),
        ...(commentId ? { comment: commentId } : {}),
        reason,
        details: details.trim(),
      });
      toast.success("Thank you. A moderator will review this report.");
      onClose();
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
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="rounded-2xl sm:max-w-md">
        <DialogHeader className="text-left">
          <span className="grid size-11 place-items-center rounded-xl bg-warning-soft text-warning">
            <Flag className="size-5" />
          </span>
          <DialogTitle className="pt-2 font-display text-xl">Report content</DialogTitle>
          <DialogDescription>
            Reports are reviewed by TIE moderators. False reports may be ignored.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <label className="block text-sm font-semibold text-foreground">
            Reason
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="mt-1.5 h-11 w-full rounded-md border bg-card px-3 text-sm font-normal text-foreground"
            >
              {reasons.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm font-semibold text-foreground">
            Details (optional)
            <Textarea
              className="mt-1.5"
              rows={4}
              value={details}
              onChange={(event) => setDetails(event.target.value)}
              maxLength={1500}
              placeholder="Tell moderators what is wrong…"
            />
          </label>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" variant="destructive" disabled={busy}>
              {busy ? <Loader2 className="animate-spin" /> : <Flag />} Submit report
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
